import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { paymentService } from '../services/paymentService.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * @route   GET /api/payments/banks
 * @desc    List available Nigerian banks
 * @access  Private
 */
router.get(
    '/banks',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const banks = await paymentService.listBanks();

        res.json({
            success: true,
            data: banks
        });
    })
);

/**
 * @route   POST /api/payments/resolve-account
 * @desc    Resolve bank account details (NIBSS lookup)
 * @access  Private
 */
router.post(
    '/resolve-account',
    authenticate,
    [
        body('accountNumber')
            .isString()
            .isLength({ min: 10, max: 10 })
            .withMessage('Account number must be 10 digits'),
        body('bankCode')
            .isString()
            .notEmpty()
            .withMessage('Bank code is required')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { accountNumber, bankCode } = req.body;

        const accountDetails = await paymentService.resolveBankAccount(accountNumber, bankCode);

        res.json({
            success: true,
            data: accountDetails
        });
    })
);

/**
 * @route   POST /api/payments/payout
 * @desc    Initiate a payout (withdrawal) to bank or crypto
 * @access  Private
 */
router.post(
    '/payout',
    authenticate,
    [
        body('amount')
            .isNumeric()
            .custom(val => val > 0)
            .withMessage('Amount must be greater than 0'),
        body('currency')
            .isIn(['NGN', 'USDC', 'USDT'])
            .withMessage('Currency must be NGN, USDC, or USDT'),
        body('destination.type')
            .isIn(['BANK', 'CRYPTO_WALLET'])
            .withMessage('Destination type must be BANK or CRYPTO_WALLET'),
        body('destination.bankCode')
            .if(body('destination.type').equals('BANK'))
            .notEmpty()
            .withMessage('Bank code is required for bank payouts'),
        body('destination.accountNumber')
            .if(body('destination.type').equals('BANK'))
            .isLength({ min: 10, max: 10 })
            .withMessage('Account number must be 10 digits'),
        body('destination.walletAddress')
            .if(body('destination.type').equals('CRYPTO_WALLET'))
            .notEmpty()
            .withMessage('Wallet address is required for crypto payouts'),
        body('narration')
            .trim()
            .notEmpty()
            .isLength({ max: 100 })
            .withMessage('Narration is required (max 100 characters)')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { amount, currency, destination, narration } = req.body;

        const result = await paymentService.initiatePayout({
            amount,
            currency,
            destination,
            narration
        });

        res.json({
            success: true,
            message: 'Payout initiated successfully',
            data: result
        });
    })
);

/**
 * @route   POST /api/payments/payment-link
 * @desc    Create a payment collection link (for invoices)
 * @access  Private
 */
router.post(
    '/payment-link',
    authenticate,
    [
        body('amount')
            .isNumeric()
            .custom(val => val > 0)
            .withMessage('Amount must be greater than 0'),
        body('currency')
            .isString()
            .notEmpty()
            .withMessage('Currency is required'),
        body('customerEmail')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid customer email is required'),
        body('customerName')
            .optional()
            .trim(),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 200 }),
        body('invoiceId')
            .optional()
            .isString()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { amount, currency, customerEmail, customerName, description, invoiceId } = req.body;

        const result = await paymentService.createPaymentLink({
            amount,
            currency,
            customerEmail,
            customerName,
            description,
            invoiceId,
            redirectUrl: `${config.frontendUrl}/invoices`
        });

        res.json({
            success: true,
            message: 'Payment link created successfully',
            data: result
        });
    })
);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Bani webhook events
 * @access  Public (verified by signature)
 */
router.post(
    '/webhook',
    asyncHandler(async (req: Request, res: Response) => {
        const signature = req.headers['x-bani-signature'] as string;
        const payload = JSON.stringify(req.body);

        // Verify webhook signature in production
        if (config.nodeEnv === 'production') {
            if (!signature || !paymentService.verifyWebhookSignature(payload, signature)) {
                logger.warn('Invalid webhook signature');
                res.status(401).json({
                    success: false,
                    error: 'Invalid signature'
                });
                return;
            }
        }

        // Process the webhook
        await paymentService.processWebhook(req.body);

        // Acknowledge receipt
        res.json({
            success: true,
            message: 'Webhook received'
        });
    })
);

/**
 * @route   GET /api/payments/status/:reference
 * @desc    Get payment/payout status by reference
 * @access  Private
 */
router.get(
    '/status/:reference',
    authenticate,
    [
        param('reference')
            .isString()
            .notEmpty()
            .withMessage('Reference is required')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { reference } = req.params;

        // In a full implementation, this would query Bani API for status
        // For now, return a placeholder
        res.json({
            success: true,
            data: {
                reference,
                status: 'PENDING',
                message: 'Status check not yet implemented - check Bani dashboard'
            }
        });
    })
);

export default router;
