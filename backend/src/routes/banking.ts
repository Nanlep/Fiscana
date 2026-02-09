import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { bankingService } from '../services/bankingService.js';
import { aiService } from '../services/aiService.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * @route   POST /api/banking/connect
 * @desc    Exchange Mono auth code for account ID after widget completion
 * @access  Private
 */
router.post(
    '/connect',
    authenticate,
    [
        body('authCode')
            .isString()
            .notEmpty()
            .withMessage('Auth code is required')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { authCode } = req.body;

        const result = await bankingService.exchangeAuthCode(authCode, userId);

        res.json({
            success: true,
            message: 'Bank account linked successfully',
            data: result
        });
    })
);

/**
 * @route   GET /api/banking/accounts
 * @desc    Get user's linked bank accounts
 * @access  Private
 */
router.get(
    '/accounts',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const accounts = await bankingService.getUserAccounts(userId);

        res.json({
            success: true,
            data: accounts
        });
    })
);

/**
 * @route   GET /api/banking/accounts/:accountId
 * @desc    Get account details
 * @access  Private
 */
router.get(
    '/accounts/:accountId',
    authenticate,
    [
        param('accountId')
            .isString()
            .notEmpty()
            .withMessage('Account ID is required')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { accountId } = req.params;

        const account = await bankingService.getAccountDetails(accountId);

        res.json({
            success: true,
            data: account
        });
    })
);

/**
 * @route   GET /api/banking/accounts/:accountId/transactions
 * @desc    Get transactions from connected bank account
 * @access  Private
 */
router.get(
    '/accounts/:accountId/transactions',
    authenticate,
    [
        param('accountId')
            .isString()
            .notEmpty()
            .withMessage('Account ID is required'),
        query('start')
            .optional()
            .isISO8601()
            .withMessage('Start date must be in ISO format'),
        query('end')
            .optional()
            .isISO8601()
            .withMessage('End date must be in ISO format'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 200 })
            .withMessage('Limit must be between 1 and 200')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { accountId } = req.params;
        const { start, end, limit } = req.query;

        const result = await bankingService.getTransactions(accountId, {
            start: start as string,
            end: end as string,
            limit: limit ? parseInt(limit as string, 10) : 50
        });

        res.json({
            success: true,
            data: result
        });
    })
);

/**
 * @route   POST /api/banking/accounts/:accountId/sync
 * @desc    Sync transactions from bank to Fiscana + AI categorization
 * @access  Private
 */
router.post(
    '/accounts/:accountId/sync',
    authenticate,
    [
        param('accountId')
            .isString()
            .notEmpty()
            .withMessage('Account ID is required')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { accountId } = req.params;

        // Get transactions from Mono
        const { transactions } = await bankingService.syncTransactions(userId, accountId);

        // AI categorize the transactions
        const descriptions = transactions.map(tx => tx.description);
        const categorized = await aiService.autoCategorizeTransactions(descriptions);

        // Merge raw transactions with AI categorization
        const enrichedTransactions = transactions.map((tx, index) => ({
            ...tx,
            categorization: categorized[index]
        }));

        res.json({
            success: true,
            message: `Synced and categorized ${transactions.length} transactions`,
            data: {
                synced: transactions.length,
                transactions: enrichedTransactions
            }
        });
    })
);

/**
 * @route   DELETE /api/banking/accounts/:accountId
 * @desc    Unlink a bank account
 * @access  Private
 */
router.delete(
    '/accounts/:accountId',
    authenticate,
    [
        param('accountId')
            .isString()
            .notEmpty()
            .withMessage('Account ID is required')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { accountId } = req.params;

        await bankingService.unlinkAccount(userId, accountId);

        res.json({
            success: true,
            message: 'Bank account unlinked successfully'
        });
    })
);

/**
 * @route   POST /api/banking/webhook
 * @desc    Handle Mono webhook events
 * @access  Public (verified by signature)
 */
router.post(
    '/webhook',
    asyncHandler(async (req: Request, res: Response) => {
        const signature = req.headers['mono-webhook-secret'] as string;
        const payload = JSON.stringify(req.body);

        // Verify webhook signature in production
        if (config.nodeEnv === 'production') {
            if (!signature || !bankingService.verifyWebhookSignature(payload, signature)) {
                logger.warn('Invalid Mono webhook signature');
                res.status(401).json({
                    success: false,
                    error: 'Invalid signature'
                });
                return;
            }
        }

        const { event, data } = req.body;

        // Process the webhook
        await bankingService.processWebhook(event, data);

        // Acknowledge receipt
        res.json({
            success: true,
            message: 'Webhook received'
        });
    })
);

export default router;
