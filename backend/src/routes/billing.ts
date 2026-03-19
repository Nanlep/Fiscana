import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { sendSubscriptionConfirmationEmail, sendSubscriptionExpiredEmail } from '../services/emailService.js';

const router = Router();

// Flutterwave API response types
interface FlwPaymentResponse {
    status: string;
    data?: {
        link?: string;
        status?: string;
        tx_ref?: string;
        meta?: Record<string, any>;
    };
}

// Helper: check if subscription is active
export function isSubscriptionActive(user: {
    role: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    trialEndsAt: Date | null;
    subscriptionEndsAt: Date | null;
}): { active: boolean; reason?: string } {
    // Admins and sandbox users always have access
    if (user.role === 'ADMIN' || user.subscriptionTier === 'SANDBOX') {
        return { active: true };
    }

    // Trial users
    if (user.subscriptionTier === 'TRIAL') {
        if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
            return { active: true };
        }
        return { active: false, reason: 'TRIAL_EXPIRED' };
    }

    // Paid users (MONTHLY / ANNUAL)
    if (user.subscriptionTier === 'MONTHLY' || user.subscriptionTier === 'ANNUAL') {
        if (user.subscriptionStatus === 'ACTIVE' && user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > new Date()) {
            return { active: true };
        }
        if (user.subscriptionStatus === 'PAST_DUE') {
            // Give 3-day grace period
            if (user.subscriptionEndsAt) {
                const grace = new Date(user.subscriptionEndsAt);
                grace.setDate(grace.getDate() + 3);
                if (grace > new Date()) {
                    return { active: true };
                }
            }
            return { active: false, reason: 'PAYMENT_OVERDUE' };
        }
        return { active: false, reason: 'SUBSCRIPTION_EXPIRED' };
    }

    return { active: false, reason: 'NO_SUBSCRIPTION' };
}

// ==================== PUBLIC ENDPOINTS (webhook) ====================

/**
 * POST /api/billing/webhook — Flutterwave webhook handler
 */
router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
    // Verify webhook signature
    const hash = req.headers['verif-hash'] as string;
    if (config.flutterwave.webhookHash && hash !== config.flutterwave.webhookHash) {
        logger.warn('[Billing] Invalid webhook hash');
        return res.status(401).json({ status: 'error' });
    }

    const event = req.body;
    logger.info('[Billing] Webhook received', { event: event.event });

    if (event.event === 'charge.completed' && event.data?.status === 'successful') {
        const txRef = event.data.tx_ref;
        const metadata = event.data.meta;

        if (metadata?.userId && metadata?.plan) {
            const plan = metadata.plan as string;
            const now = new Date();
            let subscriptionEndsAt: Date;

            if (plan === 'ANNUAL') {
                subscriptionEndsAt = new Date(now);
                subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
            } else {
                subscriptionEndsAt = new Date(now);
                subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
            }

            const user = await prisma.user.update({
                where: { id: metadata.userId },
                data: {
                    subscriptionTier: plan,
                    subscriptionStatus: 'ACTIVE',
                    subscriptionEndsAt,
                    paymentReference: txRef,
                },
            });

            // Send confirmation email
            sendSubscriptionConfirmationEmail(user.email, user.name, plan, subscriptionEndsAt);

            logger.info('[Billing] Subscription activated via webhook', { userId: metadata.userId, plan, txRef });
        }
    }

    res.status(200).json({ status: 'success' });
}));

// ==================== AUTHENTICATED ENDPOINTS ====================

router.use(authenticate);

/**
 * GET /api/billing/status — Current subscription status
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
    });

    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { active, reason } = isSubscriptionActive(user);

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (user.subscriptionTier === 'TRIAL' && user.trialEndsAt) {
        daysRemaining = Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    } else if (user.subscriptionEndsAt) {
        daysRemaining = Math.max(0, Math.ceil((new Date(user.subscriptionEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    res.json({
        success: true,
        data: {
            tier: user.subscriptionTier,
            status: user.subscriptionStatus,
            active,
            reason: active ? undefined : reason,
            trialEndsAt: user.trialEndsAt,
            subscriptionEndsAt: user.subscriptionEndsAt,
            daysRemaining,
            plans: {
                monthly: { price: config.subscription.monthlyPrice, currency: config.subscription.currency },
                annual: { price: config.subscription.annualPrice, currency: config.subscription.currency },
            },
        },
    });
}));

/**
 * POST /api/billing/initialize — Create Flutterwave payment link
 */
router.post('/initialize', [
    body('plan').isIn(['MONTHLY', 'ANNUAL']).withMessage('Plan must be MONTHLY or ANNUAL'),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { plan } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const amount = plan === 'ANNUAL' ? config.subscription.annualPrice : config.subscription.monthlyPrice;
    const txRef = `FSC-${plan}-${userId.slice(0, 8)}-${Date.now()}`;
    const planLabel = plan === 'ANNUAL' ? 'Annual (₦24,900/year)' : 'Monthly (₦2,500/month)';

    // Create Flutterwave standard payment
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.flutterwave.secretKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            tx_ref: txRef,
            amount,
            currency: config.subscription.currency,
            redirect_url: `${config.frontendUrl}?billing_verify=${txRef}`,
            customer: {
                email: user.email,
                name: user.name,
            },
            customizations: {
                title: 'Fiscana Subscription',
                description: `Fiscana ${planLabel}`,
                logo: 'https://fiscana.pro/favicon.ico',
            },
            meta: {
                userId: user.id,
                plan,
            },
        }),
    });

    const data: FlwPaymentResponse = await response.json() as FlwPaymentResponse;

    if (data.status === 'success' && data.data?.link) {
        logger.info('[Billing] Payment initialized', { userId, plan, txRef });
        res.json({
            success: true,
            data: {
                paymentUrl: data.data.link,
                txRef,
            },
        });
    } else {
        logger.error('[Billing] Payment initialization failed', { data });
        res.status(500).json({
            success: false,
            error: 'Failed to initialize payment. Please try again.',
        });
    }
}));

/**
 * GET /api/billing/verify/:txRef — Verify payment after redirect
 */
router.get('/verify/:txRef', [
    param('txRef').trim().notEmpty(),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { txRef } = req.params;
    const userId = req.user!.id;

    // Verify with Flutterwave
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`, {
        headers: {
            'Authorization': `Bearer ${config.flutterwave.secretKey}`,
        },
    });

    const data: FlwPaymentResponse = await response.json() as FlwPaymentResponse;

    if (data.status === 'success' && data.data?.status === 'successful') {
        const meta = data.data.meta || {};
        const plan = (meta.plan as string) || 'MONTHLY';
        const now = new Date();
        let subscriptionEndsAt: Date;

        if (plan === 'ANNUAL') {
            subscriptionEndsAt = new Date(now);
            subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
        } else {
            subscriptionEndsAt = new Date(now);
            subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
        }

        // Verify the payment belongs to this user
        if (meta.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Payment does not belong to this user' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                subscriptionTier: plan,
                subscriptionStatus: 'ACTIVE',
                subscriptionEndsAt,
                paymentReference: txRef,
            },
        });

        // Send confirmation email
        sendSubscriptionConfirmationEmail(user.email, user.name, plan, subscriptionEndsAt);

        logger.info('[Billing] Payment verified and subscription activated', { userId, plan, txRef });

        res.json({
            success: true,
            data: {
                subscriptionTier: plan,
                subscriptionStatus: 'ACTIVE',
                subscriptionEndsAt,
                active: true,
            },
        });
    } else {
        logger.warn('[Billing] Payment verification failed', { txRef, data });
        res.json({
            success: false,
            error: 'Payment could not be verified. If you were charged, please contact support.',
        });
    }
}));

export default router;
