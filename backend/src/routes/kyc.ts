import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

/** GET /api/kyc - List KYC requests (admin: all, user: own) */
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const where = userRole === 'ADMIN' ? {} : { userId };
    const requests = await prisma.kYCRequest.findMany({
        where,
        orderBy: { date: 'desc' }
    });
    res.json({ success: true, data: requests });
}));

/** POST /api/kyc - Submit KYC request */
router.post('/', authenticate, [
    body('bvn').trim().notEmpty().withMessage('BVN is required'),
    body('nin').trim().notEmpty().withMessage('NIN is required')
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = req.user!;
    const { bvn, nin } = req.body;

    // Check for existing pending request
    const existing = await prisma.kYCRequest.findFirst({
        where: { userId, status: 'PENDING' }
    });
    if (existing) {
        return res.status(400).json({ success: false, error: 'You already have a pending KYC request' });
    }

    const request = await prisma.kYCRequest.create({
        data: {
            userId,
            userName: user.name,
            userEmail: user.email,
            bvn,
            nin
        }
    });

    logger.info('[KYC] Request submitted', { id: request.id, userId });
    res.status(201).json({ success: true, data: request });
}));

/** POST /api/kyc/:id/review - Admin review KYC */
router.post('/:id/review', authenticate, [
    param('id').isUUID(),
    body('action').isIn(['APPROVED', 'REJECTED']).withMessage('Action must be APPROVED or REJECTED')
], validate, asyncHandler(async (req: Request, res: Response) => {
    const adminUser = req.user!;
    if (adminUser.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { id } = req.params;
    const { action } = req.body;

    const request = await prisma.kYCRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('KYC request not found');

    // Update KYC request
    const updated = await prisma.kYCRequest.update({
        where: { id },
        data: {
            status: action,
            reviewedAt: new Date(),
            reviewedBy: adminUser.id
        }
    });

    // If approved, update user's KYC status and tier
    if (action === 'APPROVED') {
        await prisma.user.update({
            where: { id: request.userId },
            data: { kycStatus: 'VERIFIED', tier: 'TIER_2' }
        });
    } else {
        await prisma.user.update({
            where: { id: request.userId },
            data: { kycStatus: 'REJECTED' }
        });
    }

    logger.info('[KYC] Reviewed', { id, action, adminId: adminUser.id });
    res.json({ success: true, data: updated });
}));

export default router;
