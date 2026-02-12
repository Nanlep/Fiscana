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
 * @desc    List available Nigerian banks (for payouts)
 * @access  Private
 */
router.get(
    '/banks',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const countryCode = (req.query.country as string) || 'NG';
        const banks = await paymentService.listBanks(countryCode);

        res.json({
            success: true,
            data: banks
        });
    })
);

/**
 * @route   GET /api/payments/payment-banks
 * @desc    List banks available for payment collections
 * @access  Private
 */
router.get(
    '/payment-banks',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const countryCode = (req.query.country as string) || 'NG';
        const banks = await paymentService.listPaymentBanks(countryCode);

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
 * @desc    Initiate a payout (withdrawal) to bank or mobile money
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
            .isString()
            .notEmpty()
            .withMessage('Currency is required'),
        body('destination.type')
            .isIn(['BANK', 'MOBILE_MONEY'])
            .withMessage('Destination type must be BANK or MOBILE_MONEY'),
        body('destination.bankCode')
            .if(body('destination.type').equals('BANK'))
            .notEmpty()
            .withMessage('Bank code is required for bank payouts'),
        body('destination.accountNumber')
            .if(body('destination.type').equals('BANK'))
            .isLength({ min: 10, max: 10 })
            .withMessage('Account number must be 10 digits'),
        body('narration')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Narration max 100 characters')
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
 * @route   POST /api/payments/payment-collection
 * @desc    Create a payment collection (virtual bank account) for invoices
 * @access  Private
 */
router.post(
    '/payment-collection',
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
        body('customerRef')
            .isString()
            .notEmpty()
            .withMessage('Customer reference is required'),
        body('accountType')
            .optional()
            .isIn(['temporary', 'permanent'])
            .withMessage('Account type must be temporary or permanent'),
        body('countryCode')
            .optional()
            .isString(),
        body('customData')
            .optional()
            .isObject()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const {
            amount,
            currency,
            customerRef,
            accountType,
            countryCode,
            holderBvn,
            bankName,
            externalRef,
            customData,
            expiryDays
        } = req.body;

        const result = await paymentService.createPaymentCollection({
            amount,
            currency,
            customerRef,
            accountType,
            countryCode,
            holderBvn,
            bankName,
            externalRef,
            customData,
            expiryDays,
        });

        res.json({
            success: true,
            message: 'Payment collection created successfully',
            data: result
        });
    })
);

/**
 * @route   POST /api/payments/payment-status
 * @desc    Check the status of a payment collection
 * @access  Private
 */
router.post(
    '/payment-status',
    authenticate,
    [
        body('payRef')
            .optional()
            .isString(),
        body('payExtRef')
            .optional()
            .isString()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { payRef, payExtRef } = req.body;

        if (!payRef && !payExtRef) {
            res.status(400).json({
                success: false,
                error: 'Either payRef or payExtRef is required'
            });
            return;
        }

        const result = await paymentService.checkPaymentStatus({ payRef, payExtRef });

        res.json({
            success: true,
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
        const hookSignature = req.headers['bani-hook-signature'] as string;
        const sharedKey = req.headers['bani-shared-key'] as string;
        const rawBody = JSON.stringify(req.body);

        // Verify webhook signature in production
        if (config.nodeEnv === 'production') {
            if (!paymentService.verifyWebhookSignature(rawBody, hookSignature, sharedKey)) {
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
 * @desc    Get payment status by reference
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

        const result = await paymentService.checkPaymentStatus({ payRef: reference });

        res.json({
            success: true,
            data: result
        });
    })
);

export default router;
