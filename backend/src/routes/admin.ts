import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Middleware: require ADMIN role for all admin routes
const requireAdmin = asyncHandler(async (req: Request, res: Response, next: any) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
});

router.use(authenticate, requireAdmin);

// ==================== USERS ====================

/** GET /api/admin/users — List all users (paginated, searchable) */
router.get('/users', [
    query('search').optional().trim(),
    query('status').optional().isIn(['ACTIVE', 'SUSPENDED']),
    query('type').optional().isIn(['INDIVIDUAL', 'CORPORATE']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (status) where.status = status;
    if (type) where.type = type;

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                type: true,
                status: true,
                companyName: true,
                kycStatus: true,
                tier: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.user.count({ where }),
    ]);

    res.json({
        success: true,
        data: { users, total, limit, offset },
    });
}));

/** PUT /api/admin/users/:id/status — Suspend or activate a user */
router.put('/users/:id/status', [
    param('id').isUUID(),
    body('status').isIn(['ACTIVE', 'SUSPENDED']).withMessage('Status must be ACTIVE or SUSPENDED'),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    // Prevent admins from suspending themselves
    if (id === req.user!.id) {
        return res.status(400).json({ success: false, error: 'Cannot change your own status' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    const updated = await prisma.user.update({
        where: { id },
        data: { status },
        select: { id: true, name: true, email: true, status: true },
    });

    logger.info('[ADMIN] User status changed', { userId: id, status, adminId: req.user!.id });
    res.json({ success: true, data: updated });
}));

/** DELETE /api/admin/users/:id — Delete a user account */
router.delete('/users/:id', [
    param('id').isUUID(),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Prevent admins from deleting themselves
    if (id === req.user!.id) {
        return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');
    if (user.role === 'ADMIN') {
        return res.status(400).json({ success: false, error: 'Cannot delete admin accounts' });
    }

    // Cascade delete handled by Prisma schema
    await prisma.user.delete({ where: { id } });

    logger.info('[ADMIN] User deleted', { userId: id, adminId: req.user!.id });
    res.json({ success: true, message: 'User deleted successfully' });
}));

// ==================== STATS ====================

/** GET /api/admin/stats — Aggregated platform stats */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        usersThisWeek,
        usersLastWeek,
        pendingKYC,
        txVolume24h,
        txVolumePrevious24h,
        totalTransactions,
        totalInvoices,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'SUSPENDED' } }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
        prisma.kYCRequest.count({ where: { status: 'PENDING' } }),
        prisma.transaction.aggregate({
            where: { createdAt: { gte: twentyFourHoursAgo } },
            _sum: { amount: true },
            _count: true,
        }),
        prisma.transaction.aggregate({
            where: {
                createdAt: {
                    gte: new Date(twentyFourHoursAgo.getTime() - 24 * 60 * 60 * 1000),
                    lt: twentyFourHoursAgo,
                },
            },
            _sum: { amount: true },
        }),
        prisma.transaction.count(),
        prisma.invoice.count(),
    ]);

    // Calculate growth percentages
    const userGrowth = usersLastWeek > 0
        ? Math.round(((usersThisWeek - usersLastWeek) / usersLastWeek) * 100)
        : usersThisWeek > 0 ? 100 : 0;

    const currentTxVolume = txVolume24h._sum.amount || 0;
    const previousTxVolume = txVolumePrevious24h._sum.amount || 0;
    const txGrowth = previousTxVolume > 0
        ? Math.round(((currentTxVolume - previousTxVolume) / previousTxVolume) * 100)
        : currentTxVolume > 0 ? 100 : 0;

    res.json({
        success: true,
        data: {
            totalUsers,
            activeUsers,
            suspendedUsers,
            userGrowth,
            pendingKYC,
            txVolume24h: currentTxVolume,
            txCount24h: txVolume24h._count,
            txGrowth,
            totalTransactions,
            totalInvoices,
        },
    });
}));

// ==================== PLATFORM CONFIG ====================

/** GET /api/admin/config — Get all platform config */
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
    const configs = await prisma.platformConfig.findMany();
    const configMap: Record<string, string> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    res.json({
        success: true,
        data: {
            commissionRate: parseFloat(configMap['commission_rate'] || '1.5'),
            exchangeRate: parseFloat(configMap['exchange_rate'] || '1600'),
        },
    });
}));

/** PUT /api/admin/config — Update platform config */
router.put('/config', [
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }),
    body('exchangeRate').optional().isFloat({ min: 1 }),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { commissionRate, exchangeRate } = req.body;
    const adminId = req.user!.id;

    const updates: Promise<any>[] = [];

    if (commissionRate !== undefined) {
        updates.push(
            prisma.platformConfig.upsert({
                where: { key: 'commission_rate' },
                update: { value: commissionRate.toString(), updatedBy: adminId },
                create: { key: 'commission_rate', value: commissionRate.toString(), updatedBy: adminId },
            })
        );
    }

    if (exchangeRate !== undefined) {
        updates.push(
            prisma.platformConfig.upsert({
                where: { key: 'exchange_rate' },
                update: { value: exchangeRate.toString(), updatedBy: adminId },
                create: { key: 'exchange_rate', value: exchangeRate.toString(), updatedBy: adminId },
            })
        );
    }

    await Promise.all(updates);

    logger.info('[ADMIN] Config updated', { commissionRate, exchangeRate, adminId });
    res.json({ success: true, message: 'Configuration updated' });
}));

// ==================== HEALTH ====================

/** GET /api/admin/health — Real system health check */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
    const healthChecks: Record<string, { status: string; latency?: number; detail?: string }> = {};

    // Check Database
    const dbStart = Date.now();
    try {
        await prisma.$queryRaw`SELECT 1`;
        healthChecks.database = { status: 'OPERATIONAL', latency: Date.now() - dbStart };
    } catch (err) {
        healthChecks.database = { status: 'DOWN', latency: Date.now() - dbStart, detail: 'Connection failed' };
    }

    // Check API itself (always operational if we reach here)
    healthChecks.api = { status: 'OPERATIONAL', latency: 0 };

    // Overall status
    const allOperational = Object.values(healthChecks).every(h => h.status === 'OPERATIONAL');

    res.json({
        success: true,
        data: {
            overall: allOperational ? 'OPERATIONAL' : 'DEGRADED',
            services: healthChecks,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        },
    });
}));

// ==================== DATA CLEANUP ====================

/** POST /api/admin/cleanup — Delete all non-admin users and their data */
router.post('/cleanup', asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.id;

    // Delete all non-admin users (cascade deletes transactions, invoices, etc.)
    const result = await prisma.user.deleteMany({
        where: {
            role: { not: 'ADMIN' },
        },
    });

    logger.info('[ADMIN] Data cleanup performed', { deletedUsers: result.count, adminId });
    res.json({
        success: true,
        message: `Cleaned up ${result.count} non-admin user(s) and all their associated data.`,
        data: { deletedUsers: result.count },
    });
}));

export default router;
