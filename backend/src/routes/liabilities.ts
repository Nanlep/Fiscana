import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

/** GET /api/liabilities - List user's liabilities */
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const liabilities = await prisma.liability.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: liabilities });
}));

/** POST /api/liabilities - Create liability */
router.post('/', authenticate, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').isIn(['NGN', 'USD']).withMessage('Currency must be NGN or USD'),
    body('type').optional().trim(),
    body('description').optional().trim(),
    body('dueDate').optional().isISO8601()
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { name, description, amount, currency, type, dueDate } = req.body;

    const liability = await prisma.liability.create({
        data: {
            userId, name, description,
            amount: parseFloat(amount),
            currency, type,
            dueDate: dueDate ? new Date(dueDate) : null
        }
    });

    logger.info('[LIABILITY] Created', { id: liability.id, userId });
    res.status(201).json({ success: true, data: liability });
}));

/** PUT /api/liabilities/:id - Update liability */
router.put('/:id', authenticate, [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('amount').optional().isNumeric(),
    body('type').optional().trim()
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.liability.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Liability not found');

    const liability = await prisma.liability.update({
        where: { id },
        data: {
            ...(req.body.name && { name: req.body.name }),
            ...(req.body.amount !== undefined && { amount: parseFloat(req.body.amount) }),
            ...(req.body.type && { type: req.body.type }),
            ...(req.body.description !== undefined && { description: req.body.description }),
        }
    });

    res.json({ success: true, data: liability });
}));

/** DELETE /api/liabilities/:id */
router.delete('/:id', authenticate, [
    param('id').isUUID()
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.liability.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Liability not found');

    await prisma.liability.delete({ where: { id } });
    logger.info('[LIABILITY] Deleted', { id, userId });
    res.json({ success: true, message: 'Liability deleted' });
}));

export default router;
