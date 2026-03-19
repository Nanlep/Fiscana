import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { sendSMEApplicationEmail, sendSMEStatusUpdateEmail } from '../services/emailService.js';

const router = Router();

// All SME routes require authentication
router.use(authenticate);

// Middleware: require ADMIN role
const requireAdmin = asyncHandler(async (req: Request, res: Response, next: any) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
});

// ==================== USER ENDPOINTS ====================

/** POST /api/sme-finance/apply — Submit SME Finance application */
router.post('/apply', [
    body('businessName').trim().notEmpty().withMessage('Business name is required'),
    body('businessType').trim().notEmpty().withMessage('Business type is required'),
    body('businessAddress').trim().notEmpty().withMessage('Business address is required'),
    body('annualRevenue').isFloat({ min: 0 }).withMessage('Annual revenue must be a positive number'),
    body('loanAmount').isFloat({ min: 1 }).withMessage('Loan amount must be greater than 0'),
    body('loanPurpose').trim().notEmpty().withMessage('Loan purpose is required'),
    body('repaymentPeriod').isInt({ min: 1, max: 120 }).withMessage('Repayment period must be between 1-120 months'),
    body('guarantorName').trim().notEmpty().withMessage('Guarantor name is required'),
    body('guarantorPhone').trim().notEmpty().withMessage('Guarantor phone is required'),
    body('guarantorEmail').isEmail().withMessage('Valid guarantor email is required'),
    body('guarantorRelationship').trim().notEmpty().withMessage('Guarantor relationship is required'),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Verify KYC status
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.kycStatus !== 'VERIFIED') {
        return res.status(403).json({
            success: false,
            error: 'KYC verification is required to apply for SME Finance.',
        });
    }

    const {
        businessName, businessType, rcNumber, businessAddress,
        annualRevenue, loanAmount, loanPurpose, repaymentPeriod,
        collateralDescription, guarantorName, guarantorPhone,
        guarantorEmail, guarantorRelationship,
        bankStatementData, bankStatementName,
        taxClearanceData, taxClearanceName,
        cacDocumentData, cacDocumentName,
    } = req.body;

    // For now, store file data as base64 URLs (could be upgraded to S3/Supabase Storage)
    const bankStatementUrl = bankStatementData ? `data:application/pdf;name=${bankStatementName};base64,${bankStatementData.split(',')[1] || bankStatementData}` : null;
    const taxClearanceUrl = taxClearanceData ? `data:application/pdf;name=${taxClearanceName};base64,${taxClearanceData.split(',')[1] || taxClearanceData}` : null;
    const cacDocumentUrl = cacDocumentData ? `data:application/pdf;name=${cacDocumentName};base64,${cacDocumentData.split(',')[1] || cacDocumentData}` : null;

    const application = await prisma.sMEApplication.create({
        data: {
            userId,
            businessName,
            businessType,
            rcNumber: rcNumber || null,
            businessAddress,
            annualRevenue: parseFloat(annualRevenue),
            loanAmount: parseFloat(loanAmount),
            loanPurpose,
            repaymentPeriod: parseInt(repaymentPeriod),
            collateralDescription: collateralDescription || null,
            bankStatementUrl,
            taxClearanceUrl,
            cacDocumentUrl,
            guarantorName,
            guarantorPhone,
            guarantorEmail,
            guarantorRelationship,
        },
    });

    // Send admin notification email (fire-and-forget)
    sendSMEApplicationEmail(user.name, user.email, businessName, loanAmount);

    logger.info('[SME] New application submitted', { applicationId: application.id, userId, businessName });

    res.status(201).json({
        success: true,
        data: application,
    });
}));

/** GET /api/sme-finance/my-applications — List user's own applications */
router.get('/my-applications', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const applications = await prisma.sMEApplication.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    res.json({
        success: true,
        data: applications,
    });
}));

// ==================== ADMIN ENDPOINTS ====================

/** GET /api/sme-finance/applications — Admin: list all applications */
router.get('/applications', requireAdmin, [
    query('status').optional().isIn(['PENDING', 'APPROVED', 'DECLINED']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (status) where.status = status;

    const [applications, total] = await Promise.all([
        prisma.sMEApplication.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true, kycStatus: true, type: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.sMEApplication.count({ where }),
    ]);

    res.json({
        success: true,
        data: { applications, total, limit, offset },
    });
}));

/** PUT /api/sme-finance/applications/:id/status — Admin: update status */
router.put('/applications/:id/status', requireAdmin, [
    param('id').isUUID(),
    body('status').isIn(['PENDING', 'APPROVED', 'DECLINED']).withMessage('Status must be PENDING, APPROVED, or DECLINED'),
    body('adminNote').optional().trim(),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const application = await prisma.sMEApplication.findUnique({
        where: { id },
        include: { user: { select: { name: true, email: true } } },
    });

    if (!application) throw new NotFoundError('SME Application not found');

    const updated = await prisma.sMEApplication.update({
        where: { id },
        data: {
            status,
            adminNote: adminNote || application.adminNote,
            reviewedAt: new Date(),
            reviewedBy: req.user!.id,
        },
    });

    // Notify user of status change
    sendSMEStatusUpdateEmail(application.user.email, application.user.name, application.businessName, status);

    logger.info('[SME] Application status updated', { applicationId: id, status, adminId: req.user!.id });

    res.json({
        success: true,
        data: updated,
    });
}));

/** GET /api/sme-finance/stats — Admin: SME stats */
router.get('/stats', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const [total, pending, approved, declined] = await Promise.all([
        prisma.sMEApplication.count(),
        prisma.sMEApplication.count({ where: { status: 'PENDING' } }),
        prisma.sMEApplication.count({ where: { status: 'APPROVED' } }),
        prisma.sMEApplication.count({ where: { status: 'DECLINED' } }),
    ]);

    res.json({
        success: true,
        data: { total, pending, approved, declined },
    });
}));

export default router;
