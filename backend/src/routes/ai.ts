import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { aiService } from '../services/aiService.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * @route   POST /api/ai/tax-analysis
 * @desc    Analyze tax liability based on user's transactions
 * @access  Private
 */
router.post(
    '/tax-analysis',
    authenticate,
    [
        body('annualIncome')
            .isNumeric()
            .withMessage('Annual income must be a number')
            .custom(val => val >= 0)
            .withMessage('Annual income cannot be negative')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { annualIncome } = req.body;

        const report = await aiService.analyzeTaxLiability(userId, annualIncome);

        res.json({
            success: true,
            data: report
        });
    })
);

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with the tax advisor AI
 * @access  Private
 */
router.post(
    '/chat',
    authenticate,
    [
        body('message').trim().notEmpty().withMessage('Message is required'),
        body('history').optional().isArray().withMessage('History must be an array')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { message, history = [] } = req.body;

        // Non-streaming response for simpler integration
        const response = await aiService.chatWithTaxAdvisorSync(userId, history, message);

        res.json({
            success: true,
            data: {
                message: response
            }
        });
    })
);

/**
 * @route   POST /api/ai/chat/stream
 * @desc    Chat with tax advisor AI (Server-Sent Events streaming)
 * @access  Private
 */
router.post(
    '/chat/stream',
    authenticate,
    [
        body('message').trim().notEmpty().withMessage('Message is required'),
        body('history').optional().isArray().withMessage('History must be an array')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { message, history = [] } = req.body;

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        try {
            for await (const chunk of aiService.chatWithTaxAdvisor(userId, history, message)) {
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        } catch (error) {
            logger.error('Chat stream error:', error);
            res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
        } finally {
            res.end();
        }
    })
);

/**
 * @route   POST /api/ai/categorize
 * @desc    Auto-categorize bank transaction descriptions
 * @access  Private
 */
router.post(
    '/categorize',
    authenticate,
    [
        body('descriptions')
            .isArray({ min: 1, max: 50 })
            .withMessage('Descriptions must be an array of 1-50 items'),
        body('descriptions.*')
            .isString()
            .trim()
            .notEmpty()
            .withMessage('Each description must be a non-empty string')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { descriptions } = req.body;

        const categorized = await aiService.autoCategorizeTransactions(descriptions);

        res.json({
            success: true,
            data: categorized
        });
    })
);

/**
 * @route   GET /api/ai/insights
 * @desc    Get AI-generated financial insights
 * @access  Private
 */
router.get(
    '/insights',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const insights = await aiService.generateFinancialInsights(userId);

        res.json({
            success: true,
            data: insights
        });
    })
);

export default router;
