import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../config/database.js';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Middleware: require ADMIN role for all admin routes
const requireAdmin = asyncHandler(async (req: Request, res: Response, next: any) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
});

router.use(authenticate, requireAdmin);

// ==================== USERS ====================

/** GET /api/admin/users — List all users (paginated, searchable) */
router.get('/users', [
    query('search').optional().trim(),
    query('status').optional().isIn(['ACTIVE', 'SUSPENDED']),
    query('type').optional().isIn(['INDIVIDUAL', 'CORPORATE']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (status) where.status = status;
    if (type) where.type = type;

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                type: true,
                status: true,
                companyName: true,
                kycStatus: true,
                tier: true,
                subscriptionTier: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.user.count({ where }),
    ]);

    res.json({
        success: true,
        data: { users, total, limit, offset },
    });
}));

/** PUT /api/admin/users/:id/status — Suspend or activate a user */
router.put('/users/:id/status', [
    param('id').isUUID(),
    body('status').isIn(['ACTIVE', 'SUSPENDED']).withMessage('Status must be ACTIVE or SUSPENDED'),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    // Prevent admins from suspending themselves
    if (id === req.user!.id) {
        return res.status(400).json({ success: false, error: 'Cannot change your own status' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    const updated = await prisma.user.update({
        where: { id },
        data: { status },
        select: { id: true, name: true, email: true, status: true },
    });

    logger.info('[ADMIN] User status changed', { userId: id, status, adminId: req.user!.id });
    res.json({ success: true, data: updated });
}));

/** PUT /api/admin/users/:id/subscription — Toggle sandbox mode for a user */
router.put('/users/:id/subscription', [
    param('id').isUUID(),
    body('subscriptionTier').isIn(['SANDBOX', 'TRIAL']).withMessage('Tier must be SANDBOX or TRIAL'),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { subscriptionTier } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    const trialEndsAt = subscriptionTier === 'TRIAL'
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Reset trial to 14 days
        : null;

    const updated = await prisma.user.update({
        where: { id },
        data: {
            subscriptionTier,
            subscriptionStatus: 'ACTIVE',
            trialEndsAt,
            subscriptionEndsAt: subscriptionTier === 'SANDBOX' ? null : undefined,
        },
    });

    logger.info('[ADMIN] User subscription changed', { userId: id, subscriptionTier, adminId: req.user!.id });
    res.json({ success: true, data: { id: updated.id, subscriptionTier: updated.subscriptionTier } });
}));

/** DELETE /api/admin/users/:id — Delete a user account and ALL related data */
router.delete('/users/:id', [
    param('id').isUUID(),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Prevent admins from deleting themselves
    if (id === req.user!.id) {
        return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');
    if (user.role === 'ADMIN') {
        return res.status(400).json({ success: false, error: 'Cannot delete admin accounts' });
    }

    // 1. Delete from Supabase Auth (prevents re-login)
    try {
        const { error: supaError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (supaError) {
            logger.warn('[ADMIN] Failed to delete Supabase auth user, continuing with DB cleanup', { userId: id, error: supaError.message });
        }
    } catch (err: any) {
        logger.warn('[ADMIN] Supabase auth delete threw, continuing with DB cleanup', { userId: id, error: err?.message });
    }

    // 2. Delete from database — Prisma cascade handles all related records:
    //    Transactions, Invoices (+ LineItems + Payments), Assets, Liabilities,
    //    Budgets, KYC docs, Wallets (+ WalletBalances), SME Applications, etc.
    await prisma.user.delete({ where: { id } });

    logger.info('[ADMIN] User and all related data deleted', { userId: id, userEmail: user.email, adminId: req.user!.id });
    res.json({ success: true, message: `User ${user.name} (${user.email}) and all related data deleted successfully` });
}));

// ==================== STATS ====================

/** GET /api/admin/stats — Aggregated platform stats */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        usersThisWeek,
        usersLastWeek,
        pendingKYC,
        txVolume24h,
        txVolumePrevious24h,
        totalTransactions,
        totalInvoices,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'SUSPENDED' } }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
        prisma.kYCRequest.count({ where: { status: 'PENDING' } }),
        prisma.transaction.aggregate({
            where: {
                createdAt: { gte: twentyFourHoursAgo },
                source: { not: 'SYSTEM_REFUND' }
            },
            _sum: { amount: true },
            _count: true,
        }),
        prisma.transaction.aggregate({
            where: {
                createdAt: {
                    gte: new Date(twentyFourHoursAgo.getTime() - 24 * 60 * 60 * 1000),
                    lt: twentyFourHoursAgo,
                },
                source: { not: 'SYSTEM_REFUND' }
            },
            _sum: { amount: true },
        }),
        prisma.transaction.count(),
        prisma.invoice.count(),
    ]);

    // Calculate growth percentages
    const userGrowth = usersLastWeek > 0
        ? Math.round(((usersThisWeek - usersLastWeek) / usersLastWeek) * 100)
        : usersThisWeek > 0 ? 100 : 0;

    const currentTxVolume = txVolume24h._sum.amount || 0;
    const previousTxVolume = txVolumePrevious24h._sum.amount || 0;
    const txGrowth = previousTxVolume > 0
        ? Math.round(((currentTxVolume - previousTxVolume) / previousTxVolume) * 100)
        : currentTxVolume > 0 ? 100 : 0;

    res.json({
        success: true,
        data: {
            totalUsers,
            activeUsers,
            suspendedUsers,
            userGrowth,
            pendingKYC,
            txVolume24h: currentTxVolume,
            txCount24h: txVolume24h._count,
            txGrowth,
            totalTransactions,
            totalInvoices,
        },
    });
}));

// ==================== PLATFORM CONFIG ====================

/** GET /api/admin/config — Get all platform config */
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
    const configs = await prisma.platformConfig.findMany();
    const configMap: Record<string, string> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    res.json({
        success: true,
        data: {
            commissionRate: parseFloat(configMap['commission_rate'] || '1.5'),
            exchangeRate: parseFloat(configMap['exchange_rate'] || '1600'),
        },
    });
}));

/** PUT /api/admin/config — Update platform config */
router.put('/config', [
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }),
    body('exchangeRate').optional().isFloat({ min: 1 }),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { commissionRate, exchangeRate } = req.body;
    const adminId = req.user!.id;

    const updates: Promise<any>[] = [];

    if (commissionRate !== undefined) {
        updates.push(
            prisma.platformConfig.upsert({
                where: { key: 'commission_rate' },
                update: { value: commissionRate.toString(), updatedBy: adminId },
                create: { key: 'commission_rate', value: commissionRate.toString(), updatedBy: adminId },
            })
        );
    }

    if (exchangeRate !== undefined) {
        updates.push(
            prisma.platformConfig.upsert({
                where: { key: 'exchange_rate' },
                update: { value: exchangeRate.toString(), updatedBy: adminId },
                create: { key: 'exchange_rate', value: exchangeRate.toString(), updatedBy: adminId },
            })
        );
    }

    await Promise.all(updates);

    logger.info('[ADMIN] Config updated', { commissionRate, exchangeRate, adminId });
    res.json({ success: true, message: 'Configuration updated' });
}));

// ==================== HEALTH ====================

/** GET /api/admin/health — Real system health check */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
    const healthChecks: Record<string, { status: string; latency?: number; detail?: string }> = {};

    // Check Database
    const dbStart = Date.now();
    try {
        await prisma.$queryRaw`SELECT 1`;
        healthChecks.database = { status: 'OPERATIONAL', latency: Date.now() - dbStart };
    } catch (err) {
        healthChecks.database = { status: 'DOWN', latency: Date.now() - dbStart, detail: 'Connection failed' };
    }

    // Check API itself (always operational if we reach here)
    healthChecks.api = { status: 'OPERATIONAL', latency: 0 };

    // Overall status
    const allOperational = Object.values(healthChecks).every(h => h.status === 'OPERATIONAL');

    res.json({
        success: true,
        data: {
            overall: allOperational ? 'OPERATIONAL' : 'DEGRADED',
            services: healthChecks,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        },
    });
}));

// ==================== DATA CLEANUP ====================

/** POST /api/admin/cleanup — Delete all non-admin users and their data */
router.post('/cleanup', asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.id;

    // Delete all non-admin users (cascade deletes transactions, invoices, etc.)
    const result = await prisma.user.deleteMany({
        where: {
            role: { not: 'ADMIN' },
        },
    });

    logger.info('[ADMIN] Data cleanup performed', { deletedUsers: result.count, adminId });
    res.json({
        success: true,
        message: `Cleaned up ${result.count} non-admin user(s) and all their associated data.`,
        data: { deletedUsers: result.count },
    });
}));

// ==================== EMAIL QUEUE ====================

/** GET /api/admin/email-queue — List queued emails with filters + pagination */
router.get('/email-queue', [
    query('status').optional().isIn(['PENDING', 'SENT', 'FAILED', 'CANCELLED']),
    query('emailType').optional().trim(),
    query('userId').optional().trim(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const emailType = req.query.emailType as string | undefined;
    const userId = req.query.userId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (status) where.status = status;
    if (emailType) where.emailType = emailType;
    if (userId) where.userId = userId;

    const [emails, total] = await Promise.all([
        prisma.emailQueue.findMany({
            where,
            orderBy: { scheduledFor: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.emailQueue.count({ where }),
    ]);

    // Also return summary counts
    const [pending, sent, failed, cancelled] = await Promise.all([
        prisma.emailQueue.count({ where: { status: 'PENDING' } }),
        prisma.emailQueue.count({ where: { status: 'SENT' } }),
        prisma.emailQueue.count({ where: { status: 'FAILED' } }),
        prisma.emailQueue.count({ where: { status: 'CANCELLED' } }),
    ]);

    res.json({
        success: true,
        data: {
            emails,
            total,
            limit,
            offset,
            summary: { pending, sent, failed, cancelled },
        },
    });
}));

/** POST /api/admin/email-queue/:id/cancel — Cancel a pending email */
router.post('/email-queue/:id/cancel', [
    param('id').isUUID(),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const email = await prisma.emailQueue.findUnique({ where: { id } });
    if (!email) {
        return res.status(404).json({ success: false, error: 'Email not found' });
    }
    if (email.status !== 'PENDING') {
        return res.status(400).json({ success: false, error: `Cannot cancel email with status: ${email.status}` });
    }

    const updated = await prisma.emailQueue.update({
        where: { id },
        data: { status: 'CANCELLED' },
    });

    logger.info('[ADMIN] Email cancelled', { emailId: id, emailType: email.emailType, adminId: req.user!.id });
    res.json({ success: true, data: updated });
}));

/** POST /api/admin/email-queue/:id/retry — Retry a failed email */
router.post('/email-queue/:id/retry', [
    param('id').isUUID(),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const email = await prisma.emailQueue.findUnique({ where: { id } });
    if (!email) {
        return res.status(404).json({ success: false, error: 'Email not found' });
    }
    if (email.status !== 'FAILED') {
        return res.status(400).json({ success: false, error: `Can only retry emails with status FAILED, got: ${email.status}` });
    }

    const updated = await prisma.emailQueue.update({
        where: { id },
        data: {
            status: 'PENDING',
            attempts: 0,
            error: null,
            scheduledFor: new Date(), // Schedule for immediate processing
        },
    });

    logger.info('[ADMIN] Email queued for retry', { emailId: id, emailType: email.emailType, adminId: req.user!.id });
    res.json({ success: true, data: updated });
}));

// ==================== BROADCAST EMAIL ====================

/**
 * POST /api/admin/broadcast-email
 * Send a custom email to a filtered audience.
 *
 * Body:
 *   subject        string   (required)
 *   body           string   (required)
 *   targetGroup    string   (required)
 *     - ALL              → all active users
 *     - PAID_ALL         → users with MONTHLY or ANNUAL subscription
 *     - PAID_MONTHLY     → MONTHLY subscribers only
 *     - PAID_ANNUAL      → ANNUAL subscribers only
 *     - UNPAID_ALL       → TRIAL + SANDBOX users
 *     - UNPAID_TRIAL     → TRIAL users only
 *     - UNPAID_SANDBOX   → SANDBOX users only
 *     - SINGLE           → a single user (requires targetEmail)
 *     - SELECTED         → specific users (requires targetUserIds array)
 *   targetEmail    string?  (required if targetGroup === 'SINGLE')
 *   targetUserIds  string[] (required if targetGroup === 'SELECTED')
 */
router.post('/broadcast-email', [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('body').trim().notEmpty().withMessage('Email body is required'),
    body('targetGroup')
        .isIn(['ALL', 'PAID_ALL', 'PAID_MONTHLY', 'PAID_ANNUAL', 'UNPAID_ALL', 'UNPAID_TRIAL', 'UNPAID_SANDBOX', 'SINGLE', 'SELECTED'])
        .withMessage('Invalid targetGroup'),
    body('targetEmail').optional({ nullable: true }).isEmail().withMessage('Invalid target email'),
    body('targetUserIds').optional({ nullable: true }).isArray().withMessage('targetUserIds must be an array'),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { subject, body: emailBody, targetGroup, targetEmail, targetUserIds } = req.body;

    // Build Prisma where clause based on targetGroup
    let where: Record<string, any> = { status: 'ACTIVE' };

    switch (targetGroup as string) {
        case 'ALL':
            // all active users — where clause is already { status: ACTIVE }
            break;

        case 'PAID_ALL':
            where = { status: 'ACTIVE', subscriptionTier: { in: ['MONTHLY', 'ANNUAL'] }, subscriptionStatus: 'ACTIVE' };
            break;

        case 'PAID_MONTHLY':
            where = { status: 'ACTIVE', subscriptionTier: 'MONTHLY', subscriptionStatus: 'ACTIVE' };
            break;

        case 'PAID_ANNUAL':
            where = { status: 'ACTIVE', subscriptionTier: 'ANNUAL', subscriptionStatus: 'ACTIVE' };
            break;

        case 'UNPAID_ALL':
            where = { status: 'ACTIVE', subscriptionTier: { in: ['TRIAL', 'SANDBOX'] } };
            break;

        case 'UNPAID_TRIAL':
            where = { status: 'ACTIVE', subscriptionTier: 'TRIAL' };
            break;

        case 'UNPAID_SANDBOX':
            where = { status: 'ACTIVE', subscriptionTier: 'SANDBOX' };
            break;

        case 'SINGLE': {
            if (!targetEmail) {
                res.status(400).json({ success: false, error: 'targetEmail is required for SINGLE targeting' });
                return;
            }
            where = { status: 'ACTIVE', email: targetEmail };
            break;
        }

        case 'SELECTED': {
            if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
                res.status(400).json({ success: false, error: 'targetUserIds must be a non-empty array for SELECTED targeting' });
                return;
            }
            where = { status: 'ACTIVE', id: { in: targetUserIds } };
            break;
        }

        default:
            res.status(400).json({ success: false, error: 'Invalid targetGroup' });
            return;
    }

    // Import email utilities (lazy import to avoid circular deps at module load)
    const { wrapHTML, sendMail } = await import('../services/emailService.js');

    // Fetch matching users — only select the fields we need
    const users = await prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true },
    });

    if (users.length === 0) {
        return res.json({ success: true, data: { sent: 0, failed: 0, total: 0 } });
    }

    // Build HTML
    const htmlBody = emailBody
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .map((line: string) => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${line}</p>`)
        .join('\n');

    const html = wrapHTML(subject, `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">${subject}</h1>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0 24px;" />
        ${htmlBody}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;" />
        <p style="margin:0;color:#64748b;font-size:13px;">— The Fiscana Team</p>
    `);

    let sent = 0;
    let failed = 0;

    // Send in batches of 10 to avoid overwhelming the email service
    const BATCH_SIZE = 10;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
            batch.map(user => sendMail(user.email, subject, html))
        );
        results.forEach(r => {
            if (r.status === 'fulfilled') sent++;
            else failed++;
        });
    }

    logger.info('[ADMIN] Broadcast email sent', {
        subject,
        targetGroup,
        total: users.length,
        sent,
        failed,
        adminId: req.user!.id,
    });

    res.json({
        success: true,
        data: {
            sent,
            failed,
            total: users.length,
            targetGroup,
        },
    });
}));

export default router;
