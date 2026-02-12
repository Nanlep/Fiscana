import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

/** GET /api/budgets - List user's budgets */
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const budgets = await prisma.budget.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: budgets });
}));

/** POST /api/budgets - Create budget */
router.post('/', authenticate, [
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('limit').isNumeric().withMessage('Limit must be a number'),
    body('currency').isIn(['NGN', 'USD']).withMessage('Currency must be NGN or USD'),
    body('type').isIn(['BUSINESS', 'PERSONAL']).withMessage('Type must be BUSINESS or PERSONAL'),
    body('period').optional().isIn(['MONTHLY', 'QUARTERLY', 'YEARLY'])
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { category, limit, currency, type, period = 'MONTHLY' } = req.body;

    const budget = await prisma.budget.upsert({
        where: { userId_category_period: { userId, category, period } },
        update: { limit: parseFloat(limit), currency, type },
        create: { userId, category, limit: parseFloat(limit), currency, type, period }
    });

    logger.info('[BUDGET] Upserted', { id: budget.id, userId });
    res.status(201).json({ success: true, data: budget });
}));

/** DELETE /api/budgets/:id */
router.delete('/:id', authenticate, [
    param('id').isUUID()
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Budget not found');

    await prisma.budget.delete({ where: { id } });
    logger.info('[BUDGET] Deleted', { id, userId });
    res.json({ success: true, message: 'Budget deleted' });
}));

export default router;
