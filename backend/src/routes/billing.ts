import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { sendSubscriptionConfirmationEmail, sendSubscriptionExpiredEmail } from '../services/emailService.js';
import crypto from 'crypto';

const router = Router();

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

// Helper: activate subscription after successful payment
async function activateSubscription(userId: string, plan: string, txRef: string) {
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

    logger.info('[Billing] Subscription activated', { userId, plan, txRef });

    return { user, subscriptionEndsAt };
}

// ==================== PUBLIC ENDPOINTS (webhook) ====================

/**
 * POST /api/billing/webhook — Bani webhook handler
 * Bani sends webhooks for payment status updates.
 */
router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
    // Verify Bani webhook signature
    const webhookKey = req.headers['bani_webhook_key'] as string;
    if (config.bani.webhookKey && webhookKey !== config.bani.webhookKey) {
        logger.warn('[Billing] Invalid Bani webhook key');
        return res.status(401).json({ status: 'error' });
    }

    const event = req.body;
    logger.info('[Billing] Bani webhook received', { event: event.event, data: event.data });

    // Handle successful payment collection
    if (event.event === 'payment_collection' && event.data) {
        const payStatus = event.data.pay_status;
        const customData = event.data.custom_data;

        if (payStatus === 'successful' && customData?.userId && customData?.plan) {
            const userId = customData.userId as string;
            const plan = customData.plan as string;
            const txRef = event.data.pay_ref || event.data.pay_ext_ref || '';

            try {
                await activateSubscription(userId, plan, txRef);
                logger.info('[Billing] Subscription activated via Bani webhook', { userId, plan, txRef });
            } catch (err: any) {
                logger.error('[Billing] Failed to activate subscription via webhook', { userId, plan, error: err.message });
            }
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
 * POST /api/billing/initialize — Prepare payment data for Bani widget
 * Returns amount, currency, and txRef for the frontend to launch BaniPopUp.
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

    logger.info('[Billing] Payment initialized for Bani widget', { userId, plan, txRef, amount });

    res.json({
        success: true,
        data: {
            amount,
            currency: config.subscription.currency,
            txRef,
            plan,
        },
    });
}));

/**
 * POST /api/billing/confirm — Confirm payment after BaniPopUp callback
 * Called by the frontend after BaniPopUp fires its success callback.
 */
router.post('/confirm', [
    body('txRef').trim().notEmpty().withMessage('Transaction reference is required'),
    body('merchantRef').trim().notEmpty().withMessage('Merchant reference is required'),
    body('plan').isIn(['MONTHLY', 'ANNUAL']).withMessage('Plan must be MONTHLY or ANNUAL'),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { txRef, merchantRef, plan } = req.body;

    logger.info('[Billing] Confirming Bani payment', { userId, txRef, merchantRef, plan });

    // Activate the subscription
    const { subscriptionEndsAt } = await activateSubscription(userId, plan, merchantRef);

    res.json({
        success: true,
        data: {
            subscriptionTier: plan,
            subscriptionStatus: 'ACTIVE',
            subscriptionEndsAt,
            active: true,
        },
    });
}));

export default router;
