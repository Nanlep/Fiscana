import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { prisma } from '../config/database.js';

const router = Router();

// ==================== USER ENDPOINTS ====================

/**
 * @route   POST /api/support/tickets
 * @desc    Create a new support ticket
 * @access  Private
 */
router.post(
    '/tickets',
    authenticate,
    [
        body('subject').trim().notEmpty().withMessage('Subject is required'),
        body('message').trim().notEmpty().withMessage('Message is required'),
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { subject, message } = req.body;

        const ticket = await prisma.supportTicket.create({
            data: {
                userId,
                subject,
                messages: {
                    create: {
                        senderId: userId,
                        senderRole: 'USER',
                        senderName: req.user!.name,
                        message,
                    },
                },
            },
            include: {
                messages: true,
            },
        });

        res.status(201).json({
            success: true,
            data: ticket,
        });
    })
);

/**
 * @route   GET /api/support/tickets
 * @desc    List current user's tickets
 * @access  Private
 */
router.get(
    '/tickets',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const tickets = await prisma.supportTicket.findMany({
            where: { userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        res.json({
            success: true,
            data: tickets,
        });
    })
);

/**
 * @route   GET /api/support/tickets/:id
 * @desc    Get a single ticket with messages
 * @access  Private
 */
router.get(
    '/tickets/:id',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        const ticket = await prisma.supportTicket.findFirst({
            where: { id, userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!ticket) {
            res.status(404).json({ success: false, error: 'Ticket not found' });
            return;
        }

        res.json({ success: true, data: ticket });
    })
);

/**
 * @route   POST /api/support/tickets/:id/messages
 * @desc    Add a message to a ticket (user or admin)
 * @access  Private
 */
router.post(
    '/tickets/:id/messages',
    authenticate,
    [body('message').trim().notEmpty().withMessage('Message is required')],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { id } = req.params;
        const { message } = req.body;

        // Users can only reply to their own tickets; admins can reply to any
        const whereClause = userRole === 'ADMIN' ? { id } : { id, userId };
        const ticket = await prisma.supportTicket.findFirst({ where: whereClause });

        if (!ticket) {
            res.status(404).json({ success: false, error: 'Ticket not found' });
            return;
        }

        const newMessage = await prisma.ticketMessage.create({
            data: {
                ticketId: id,
                senderId: userId,
                senderRole: userRole,
                senderName: req.user!.name,
                message,
            },
        });

        // If admin replies, update status to IN_PROGRESS if still OPEN
        if (userRole === 'ADMIN' && ticket.status === 'OPEN') {
            await prisma.supportTicket.update({
                where: { id },
                data: { status: 'IN_PROGRESS' },
            });
        }

        // If user replies to RESOLVED ticket, reopen it
        if (userRole === 'USER' && ticket.status === 'RESOLVED') {
            await prisma.supportTicket.update({
                where: { id },
                data: { status: 'OPEN' },
            });
        }

        res.status(201).json({ success: true, data: newMessage });
    })
);

// ==================== ADMIN ENDPOINTS ====================

/**
 * @route   GET /api/support/admin/tickets
 * @desc    List all support tickets (admin only)
 * @access  Private (Admin)
 */
router.get(
    '/admin/tickets',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        if (req.user!.role !== 'ADMIN') {
            res.status(403).json({ success: false, error: 'Admin access required' });
            return;
        }

        const { status, limit = '50', offset = '0' } = req.query as Record<string, string>;

        const where: any = {};
        if (status) where.status = status;

        const [tickets, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    messages: {
                        orderBy: { createdAt: 'asc' },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset),
            }),
            prisma.supportTicket.count({ where }),
        ]);

        res.json({ success: true, data: { tickets, total } });
    })
);

/**
 * @route   PUT /api/support/admin/tickets/:id/status
 * @desc    Update ticket status (admin only)
 * @access  Private (Admin)
 */
router.put(
    '/admin/tickets/:id/status',
    authenticate,
    [body('status').isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).withMessage('Invalid status')],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        if (req.user!.role !== 'ADMIN') {
            res.status(403).json({ success: false, error: 'Admin access required' });
            return;
        }

        const { id } = req.params;
        const { status } = req.body;

        const ticket = await prisma.supportTicket.update({
            where: { id },
            data: { status },
        });

        res.json({ success: true, data: ticket });
    })
);

export default router;
