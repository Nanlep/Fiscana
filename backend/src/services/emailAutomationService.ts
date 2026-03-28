import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sendMail } from './emailService.js';
import {
    EMAIL_TYPES,
    FREE_SEQUENCE_SCHEDULE,
    PAID_SEQUENCE_SCHEDULE,
    getEmailTemplate,
} from './emailTemplates.js';

// ============================================================
// Constants
// ============================================================

const SCHEDULER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const BATCH_SIZE = 20; // Max emails to process per scheduler cycle

// ============================================================
// Queue Functions
// ============================================================

/**
 * Queue the 5 free-user onboarding emails (24h, 3d, 7d, 10d, 14d from now)
 */
export async function queueFreeUserSequence(userId: string, email: string, name: string): Promise<void> {
    const now = Date.now();

    try {
        // Check if any free emails are already queued for this user (prevent duplicates)
        const existing = await prisma.emailQueue.findFirst({
            where: {
                userId,
                emailType: { in: FREE_SEQUENCE_SCHEDULE.map(s => s.type) },
                status: 'PENDING',
            },
        });

        if (existing) {
            logger.info(`[EMAIL-AUTO] Free sequence already queued for user ${userId}, skipping`);
            return;
        }

        const records = FREE_SEQUENCE_SCHEDULE.map(schedule => ({
            userId,
            userEmail: email,
            userName: name,
            emailType: schedule.type,
            status: 'PENDING',
            scheduledFor: new Date(now + schedule.delayMs),
            attempts: 0,
            maxAttempts: 3,
        }));

        await prisma.emailQueue.createMany({ data: records });

        logger.info(`[EMAIL-AUTO] Queued ${records.length} free-user emails for ${email}`, {
            userId,
            types: records.map(r => r.emailType),
            scheduledFor: records.map(r => r.scheduledFor.toISOString()),
        });
    } catch (error: any) {
        logger.error(`[EMAIL-AUTO] Failed to queue free sequence for ${email}:`, error.message);
    }
}

/**
 * Send immediate payment confirmation + queue 4 follow-up emails (7d, 14d, 30d, 45d)
 */
export async function queuePaidUserSequence(
    userId: string,
    email: string,
    name: string,
    plan: 'MONTHLY' | 'ANNUAL'
): Promise<void> {
    const now = Date.now();

    try {
        // 1. Send the payment confirmation email immediately (not queued)
        const confirmType = plan === 'ANNUAL'
            ? EMAIL_TYPES.PAID_CONFIRM_ANNUAL
            : EMAIL_TYPES.PAID_CONFIRM_MONTHLY;

        const confirmTemplate = getEmailTemplate(confirmType, name);
        if (confirmTemplate) {
            await sendMail(email, confirmTemplate.subject, confirmTemplate.html);

            // Record it in the queue as already SENT for audit
            await prisma.emailQueue.create({
                data: {
                    userId,
                    userEmail: email,
                    userName: name,
                    emailType: confirmType,
                    status: 'SENT',
                    scheduledFor: new Date(),
                    sentAt: new Date(),
                    attempts: 1,
                    maxAttempts: 1,
                    metadata: JSON.stringify({ plan }),
                },
            });

            logger.info(`[EMAIL-AUTO] Sent payment confirmation (${plan}) to ${email}`);
        }

        // 2. Queue the follow-up paid emails
        const followUpRecords = PAID_SEQUENCE_SCHEDULE.map(schedule => ({
            userId,
            userEmail: email,
            userName: name,
            emailType: schedule.type,
            status: 'PENDING',
            scheduledFor: new Date(now + schedule.delayMs),
            attempts: 0,
            maxAttempts: 3,
            metadata: JSON.stringify({ plan }),
        }));

        await prisma.emailQueue.createMany({ data: followUpRecords });

        logger.info(`[EMAIL-AUTO] Queued ${followUpRecords.length} paid-user follow-up emails for ${email}`, {
            userId,
            plan,
            types: followUpRecords.map(r => r.emailType),
        });
    } catch (error: any) {
        logger.error(`[EMAIL-AUTO] Failed to queue paid sequence for ${email}:`, error.message);
    }
}

/**
 * Cancel all pending emails for a user, optionally filtered by email types.
 * Used when a free user upgrades to paid (cancel remaining free emails).
 */
export async function cancelPendingEmails(userId: string, emailTypes?: string[]): Promise<void> {
    try {
        const where: any = {
            userId,
            status: 'PENDING',
        };

        if (emailTypes && emailTypes.length > 0) {
            where.emailType = { in: emailTypes };
        }

        const result = await prisma.emailQueue.updateMany({
            where,
            data: {
                status: 'CANCELLED',
                updatedAt: new Date(),
            },
        });

        if (result.count > 0) {
            logger.info(`[EMAIL-AUTO] Cancelled ${result.count} pending emails for user ${userId}`, {
                emailTypes: emailTypes || 'ALL',
            });
        }
    } catch (error: any) {
        logger.error(`[EMAIL-AUTO] Failed to cancel emails for user ${userId}:`, error.message);
    }
}

// ============================================================
// Scheduler: Process Due Emails
// ============================================================

/**
 * Find and send all emails that are due.
 * Called by the scheduler every 30 minutes.
 */
export async function processDueEmails(): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    try {
        // Fetch due emails: PENDING + scheduledFor <= now + attempts < maxAttempts
        const dueEmails = await prisma.emailQueue.findMany({
            where: {
                status: 'PENDING',
                scheduledFor: { lte: new Date() },
            },
            orderBy: { scheduledFor: 'asc' },
            take: BATCH_SIZE,
        });

        if (dueEmails.length === 0) {
            return { sent: 0, failed: 0 };
        }

        logger.info(`[EMAIL-AUTO] Processing ${dueEmails.length} due email(s)`);

        for (const email of dueEmails) {
            try {
                // Check if max attempts exceeded
                if (email.attempts >= email.maxAttempts) {
                    await prisma.emailQueue.update({
                        where: { id: email.id },
                        data: {
                            status: 'FAILED',
                            error: 'Max retry attempts exceeded',
                        },
                    });
                    failed++;
                    continue;
                }

                // Get the template
                const template = getEmailTemplate(email.emailType, email.userName);
                if (!template) {
                    await prisma.emailQueue.update({
                        where: { id: email.id },
                        data: {
                            status: 'FAILED',
                            error: `Unknown email type: ${email.emailType}`,
                        },
                    });
                    failed++;
                    continue;
                }

                // Send the email
                await sendMail(email.userEmail, template.subject, template.html);

                // Mark as sent
                await prisma.emailQueue.update({
                    where: { id: email.id },
                    data: {
                        status: 'SENT',
                        sentAt: new Date(),
                        attempts: email.attempts + 1,
                    },
                });

                sent++;
                logger.info(`[EMAIL-AUTO] Sent ${email.emailType} to ${email.userEmail}`);

            } catch (error: any) {
                // Increment attempts, keep as PENDING for retry
                const newAttempts = email.attempts + 1;
                const newStatus = newAttempts >= email.maxAttempts ? 'FAILED' : 'PENDING';

                await prisma.emailQueue.update({
                    where: { id: email.id },
                    data: {
                        attempts: newAttempts,
                        status: newStatus,
                        error: error.message || 'Unknown error',
                    },
                });

                if (newStatus === 'FAILED') {
                    failed++;
                }

                logger.error(`[EMAIL-AUTO] Failed to send ${email.emailType} to ${email.userEmail} (attempt ${newAttempts}):`, error.message);
            }
        }
    } catch (error: any) {
        logger.error('[EMAIL-AUTO] Scheduler error:', error.message);
    }

    if (sent > 0 || failed > 0) {
        logger.info(`[EMAIL-AUTO] Scheduler cycle complete: ${sent} sent, ${failed} failed`);
    }

    return { sent, failed };
}

// ============================================================
// Scheduler Loop
// ============================================================

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the email automation scheduler.
 * Runs every 30 minutes to check for and send due emails.
 */
export function startEmailScheduler(): void {
    if (schedulerInterval) {
        logger.warn('[EMAIL-AUTO] Scheduler already running, skipping duplicate start');
        return;
    }

    logger.info(`[EMAIL-AUTO] 📧 Email automation scheduler started (interval: ${SCHEDULER_INTERVAL_MS / 1000 / 60} min)`);

    // Run immediately on startup to catch any overdue emails
    processDueEmails().catch(err =>
        logger.error('[EMAIL-AUTO] Initial scheduler run failed:', err.message)
    );

    // Then run on interval
    schedulerInterval = setInterval(() => {
        processDueEmails().catch(err =>
            logger.error('[EMAIL-AUTO] Scheduled run failed:', err.message)
        );
    }, SCHEDULER_INTERVAL_MS);
}

/**
 * Stop the email automation scheduler.
 * Used for graceful shutdown.
 */
export function stopEmailScheduler(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        logger.info('[EMAIL-AUTO] Email automation scheduler stopped');
    }
}
