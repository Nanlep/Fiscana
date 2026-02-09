import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * @route   GET /api/transactions
 * @desc    Get user's transactions with optional filters
 * @access  Private
 */
router.get(
    '/',
    authenticate,
    [
        query('type').optional().isIn(['INCOME', 'EXPENSE']).withMessage('Type must be INCOME or EXPENSE'),
        query('startDate').optional().isISO8601().withMessage('Start date must be ISO format'),
        query('endDate').optional().isISO8601().withMessage('End date must be ISO format'),
        query('category').optional().isString(),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
        query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { type, startDate, endDate, category, limit = '50', offset = '0' } = req.query;

        const where: any = { userId };

        if (type) where.type = type;
        if (category) where.category = category;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                take: parseInt(limit as string, 10),
                skip: parseInt(offset as string, 10)
            }),
            prisma.transaction.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total,
                    limit: parseInt(limit as string, 10),
                    offset: parseInt(offset as string, 10)
                }
            }
        });
    })
);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get single transaction
 * @access  Private
 */
router.get(
    '/:id',
    authenticate,
    [
        param('id').isUUID().withMessage('Invalid transaction ID')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        const transaction = await prisma.transaction.findFirst({
            where: { id, userId }
        });

        if (!transaction) {
            throw new NotFoundError('Transaction not found');
        }

        res.json({
            success: true,
            data: transaction
        });
    })
);

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction
 * @access  Private
 */
router.post(
    '/',
    authenticate,
    [
        body('date').isISO8601().withMessage('Date must be ISO format'),
        body('description').trim().notEmpty().withMessage('Description is required'),
        body('payee').trim().notEmpty().withMessage('Payee is required'),
        body('amount').isNumeric().custom(val => val !== 0).withMessage('Amount must be non-zero'),
        body('currency').isIn(['NGN', 'USD']).withMessage('Currency must be NGN or USD'),
        body('type').isIn(['INCOME', 'EXPENSE']).withMessage('Type must be INCOME or EXPENSE'),
        body('category').trim().notEmpty().withMessage('Category is required'),
        body('expenseCategory').optional().isIn(['BUSINESS', 'PERSONAL']),
        body('taxDeductible').optional().isBoolean(),
        body('tags').optional().isArray()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const {
            date, description, payee, amount, currency, type,
            category, expenseCategory, taxDeductible, tags,
            receiptUrl, vatAmount, whtAmount, grossAmount, taxTag
        } = req.body;

        const transaction = await prisma.transaction.create({
            data: {
                userId,
                date: new Date(date),
                description,
                payee,
                amount: parseFloat(amount),
                grossAmount: grossAmount ? parseFloat(grossAmount) : null,
                currency,
                type,
                category,
                expenseCategory,
                taxDeductible: taxDeductible ?? false,
                tags: tags ?? [],
                receiptUrl,
                vatAmount: vatAmount ? parseFloat(vatAmount) : null,
                whtAmount: whtAmount ? parseFloat(whtAmount) : null,
                taxTag,
                source: 'MANUAL',
                createdBy: userId
            }
        });

        logger.info('[TRANSACTION] Created transaction', { id: transaction.id, userId });

        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            data: transaction
        });
    })
);

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update a transaction
 * @access  Private
 */
router.put(
    '/:id',
    authenticate,
    [
        param('id').isUUID().withMessage('Invalid transaction ID'),
        body('date').optional().isISO8601(),
        body('description').optional().trim().notEmpty(),
        body('payee').optional().trim().notEmpty(),
        body('amount').optional().isNumeric(),
        body('currency').optional().isIn(['NGN', 'USD']),
        body('type').optional().isIn(['INCOME', 'EXPENSE']),
        body('category').optional().trim().notEmpty()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        // Check ownership
        const existing = await prisma.transaction.findFirst({
            where: { id, userId }
        });

        if (!existing) {
            throw new NotFoundError('Transaction not found');
        }

        const updateData: any = { ...req.body, modifiedAt: new Date() };
        if (updateData.date) updateData.date = new Date(updateData.date);
        if (updateData.amount) updateData.amount = parseFloat(updateData.amount);

        const transaction = await prisma.transaction.update({
            where: { id },
            data: updateData
        });

        logger.info('[TRANSACTION] Updated transaction', { id, userId });

        res.json({
            success: true,
            message: 'Transaction updated successfully',
            data: transaction
        });
    })
);

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete a transaction
 * @access  Private
 */
router.delete(
    '/:id',
    authenticate,
    [
        param('id').isUUID().withMessage('Invalid transaction ID')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        // Check ownership
        const existing = await prisma.transaction.findFirst({
            where: { id, userId }
        });

        if (!existing) {
            throw new NotFoundError('Transaction not found');
        }

        await prisma.transaction.delete({ where: { id } });

        logger.info('[TRANSACTION] Deleted transaction', { id, userId });

        res.json({
            success: true,
            message: 'Transaction deleted successfully'
        });
    })
);

/**
 * @route   GET /api/transactions/summary
 * @desc    Get transaction summary (totals by type/category)
 * @access  Private
 */
router.get(
    '/summary',
    authenticate,
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { startDate, endDate } = req.query;

        const where: any = { userId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }

        const [income, expense] = await Promise.all([
            prisma.transaction.aggregate({
                where: { ...where, type: 'INCOME' },
                _sum: { amount: true },
                _count: true
            }),
            prisma.transaction.aggregate({
                where: { ...where, type: 'EXPENSE' },
                _sum: { amount: true },
                _count: true
            })
        ]);

        res.json({
            success: true,
            data: {
                income: {
                    total: income._sum.amount ?? 0,
                    count: income._count
                },
                expense: {
                    total: expense._sum.amount ?? 0,
                    count: expense._count
                },
                netIncome: (income._sum.amount ?? 0) - (expense._sum.amount ?? 0)
            }
        });
    })
);

export default router;
