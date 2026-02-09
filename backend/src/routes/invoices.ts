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
 * @route   GET /api/invoices
 * @desc    Get user's invoices with optional filters
 * @access  Private
 */
router.get(
    '/',
    authenticate,
    [
        query('status').optional().isIn(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 })
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { status, limit = '50', offset = '0' } = req.query;

        const where: any = { userId };
        if (status) where.status = status;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: { items: true },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit as string, 10),
                skip: parseInt(offset as string, 10)
            }),
            prisma.invoice.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                invoices,
                pagination: { total, limit: parseInt(limit as string, 10), offset: parseInt(offset as string, 10) }
            }
        });
    })
);

/**
 * @route   GET /api/invoices/:id
 * @desc    Get single invoice with items
 * @access  Private
 */
router.get(
    '/:id',
    authenticate,
    [param('id').isUUID().withMessage('Invalid invoice ID')],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        const invoice = await prisma.invoice.findFirst({
            where: { id, userId },
            include: { items: true, payments: true }
        });

        if (!invoice) {
            throw new NotFoundError('Invoice not found');
        }

        res.json({ success: true, data: invoice });
    })
);

/**
 * @route   POST /api/invoices
 * @desc    Create a new invoice
 * @access  Private
 */
router.post(
    '/',
    authenticate,
    [
        body('clientName').trim().notEmpty().withMessage('Client name is required'),
        body('clientEmail').isEmail().normalizeEmail().withMessage('Valid client email is required'),
        body('issueDate').isISO8601().withMessage('Issue date must be ISO format'),
        body('dueDate').isISO8601().withMessage('Due date must be ISO format'),
        body('currency').isIn(['NGN', 'USD']).withMessage('Currency must be NGN or USD'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        body('items.*.description').trim().notEmpty(),
        body('items.*.quantity').isInt({ min: 1 }),
        body('items.*.unitPrice').isNumeric().custom(val => val > 0)
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { clientName, clientEmail, issueDate, dueDate, currency, items, vatRate = 0, whtRate = 0 } = req.body;

        // Calculate totals
        const subTotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
        const vatAmount = subTotal * (vatRate / 100);
        const whtDeduction = subTotal * (whtRate / 100);
        const totalAmount = subTotal + vatAmount - whtDeduction;

        const invoice = await prisma.invoice.create({
            data: {
                userId,
                clientName,
                clientEmail,
                issueDate: new Date(issueDate),
                dueDate: new Date(dueDate),
                currency,
                subTotal,
                vatAmount,
                whtDeduction,
                totalAmount,
                items: {
                    create: items.map((item: any) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice
                    }))
                }
            },
            include: { items: true }
        });

        logger.info('[INVOICE] Created invoice', { id: invoice.id, userId });

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: invoice
        });
    })
);

/**
 * @route   PUT /api/invoices/:id
 * @desc    Update invoice (only DRAFT invoices can be edited)
 * @access  Private
 */
router.put(
    '/:id',
    authenticate,
    [
        param('id').isUUID().withMessage('Invalid invoice ID'),
        body('clientName').optional().trim().notEmpty(),
        body('clientEmail').optional().isEmail().normalizeEmail(),
        body('dueDate').optional().isISO8601()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        const existing = await prisma.invoice.findFirst({ where: { id, userId } });

        if (!existing) {
            throw new NotFoundError('Invoice not found');
        }

        if (existing.status !== 'DRAFT') {
            throw new ValidationError('Only draft invoices can be edited');
        }

        const invoice = await prisma.invoice.update({
            where: { id },
            data: { ...req.body, dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined },
            include: { items: true }
        });

        logger.info('[INVOICE] Updated invoice', { id, userId });

        res.json({ success: true, message: 'Invoice updated', data: invoice });
    })
);

/**
 * @route   POST /api/invoices/:id/send
 * @desc    Mark invoice as sent
 * @access  Private
 */
router.post(
    '/:id/send',
    authenticate,
    [param('id').isUUID()],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        const existing = await prisma.invoice.findFirst({ where: { id, userId } });

        if (!existing) throw new NotFoundError('Invoice not found');
        if (existing.status !== 'DRAFT') throw new ValidationError('Invoice already sent');

        const invoice = await prisma.invoice.update({
            where: { id },
            data: { status: 'SENT' }
        });

        logger.info('[INVOICE] Invoice sent', { id, userId });

        res.json({ success: true, message: 'Invoice marked as sent', data: invoice });
    })
);

/**
 * @route   POST /api/invoices/:id/payment
 * @desc    Record a payment against an invoice
 * @access  Private
 */
router.post(
    '/:id/payment',
    authenticate,
    [
        param('id').isUUID(),
        body('amount').isNumeric().custom(val => val > 0).withMessage('Amount must be positive'),
        body('date').optional().isISO8601(),
        body('note').optional().trim()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;
        const { amount, date, note } = req.body;

        const invoice = await prisma.invoice.findFirst({ where: { id, userId } });

        if (!invoice) throw new NotFoundError('Invoice not found');

        const paymentAmount = parseFloat(amount);
        const newAmountPaid = invoice.amountPaid + paymentAmount;
        const newStatus = newAmountPaid >= invoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID';

        await prisma.$transaction([
            prisma.paymentRecord.create({
                data: {
                    invoiceId: id,
                    amount: paymentAmount,
                    date: date ? new Date(date) : new Date(),
                    note
                }
            }),
            prisma.invoice.update({
                where: { id },
                data: {
                    amountPaid: newAmountPaid,
                    status: newStatus,
                    paidDate: newStatus === 'PAID' ? new Date() : null
                }
            })
        ]);

        logger.info('[INVOICE] Payment recorded', { id, amount: paymentAmount, userId });

        res.json({ success: true, message: 'Payment recorded', data: { amountPaid: newAmountPaid, status: newStatus } });
    })
);

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Delete an invoice (only DRAFT status)
 * @access  Private
 */
router.delete(
    '/:id',
    authenticate,
    [param('id').isUUID()],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        const existing = await prisma.invoice.findFirst({ where: { id, userId } });

        if (!existing) throw new NotFoundError('Invoice not found');
        if (existing.status !== 'DRAFT') throw new ValidationError('Only draft invoices can be deleted');

        await prisma.invoice.delete({ where: { id } });

        logger.info('[INVOICE] Deleted invoice', { id, userId });

        res.json({ success: true, message: 'Invoice deleted' });
    })
);

export default router;
