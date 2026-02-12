import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

/** GET /api/assets - List user's assets */
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const assets = await prisma.asset.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: assets });
}));

/** POST /api/assets - Create asset */
router.post('/', authenticate, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('value').isNumeric().withMessage('Value must be a number'),
    body('currency').isIn(['NGN', 'USD']).withMessage('Currency must be NGN or USD'),
    body('type').trim().notEmpty().withMessage('Type is required'),
    body('description').optional().trim()
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { name, description, value, currency, type } = req.body;

    const asset = await prisma.asset.create({
        data: { userId, name, description, value: parseFloat(value), currency, type }
    });

    logger.info('[ASSET] Created', { id: asset.id, userId });
    res.status(201).json({ success: true, data: asset });
}));

/** PUT /api/assets/:id - Update asset */
router.put('/:id', authenticate, [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('value').optional().isNumeric(),
    body('type').optional().trim().notEmpty()
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.asset.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Asset not found');

    const asset = await prisma.asset.update({
        where: { id },
        data: {
            ...(req.body.name && { name: req.body.name }),
            ...(req.body.value !== undefined && { value: parseFloat(req.body.value) }),
            ...(req.body.type && { type: req.body.type }),
            ...(req.body.description !== undefined && { description: req.body.description }),
        }
    });

    res.json({ success: true, data: asset });
}));

/** DELETE /api/assets/:id */
router.delete('/:id', authenticate, [
    param('id').isUUID()
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.asset.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Asset not found');

    await prisma.asset.delete({ where: { id } });
    logger.info('[ASSET] Deleted', { id, userId });
    res.json({ success: true, message: 'Asset deleted' });
}));

export default router;
