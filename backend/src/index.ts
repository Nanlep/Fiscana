import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Create Express app
const app = express();

// Validate configuration
try {
    validateConfig();
} catch (error) {
    logger.error('Configuration validation failed:', error);
    process.exit(1);
}

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
    config.frontendUrl,
    'http://localhost:3000',
    'https://fiscana.pro',
    'https://www.fiscana.pro',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (all environments)
app.use((req, res, next) => {
    const startTime = Date.now();

    // Log on response finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.request(req.method, req.path, res.statusCode, duration, {
            userAgent: req.get('user-agent'),
            ip: req.ip,
        });
    });

    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Fiscana API is running',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});

// API routes
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import paymentRoutes from './routes/payments.js';
import bankingRoutes from './routes/banking.js';
import transactionRoutes from './routes/transactions.js';
import invoiceRoutes from './routes/invoices.js';
import assetRoutes from './routes/assets.js';
import liabilityRoutes from './routes/liabilities.js';
import budgetRoutes from './routes/budgets.js';
import kycRoutes from './routes/kyc.js';
import adminRoutes from './routes/admin.js';

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/liabilities', liabilityRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
    logger.info(`🚀 Fiscana Backend API running on port ${PORT}`);
    logger.info(`📝 Environment: ${config.nodeEnv}`);
    logger.info(`🌐 Frontend URL: ${config.frontendUrl}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(() => {
        logger.info('HTTP server closed');
    });

    // Close database connections
    try {
        const { prisma } = await import('./config/database.js');
        await prisma.$disconnect();
        logger.info('Database connection closed');
    } catch (error) {
        logger.error('Error closing database connection', error);
    }

    // Exit with success code
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
});

export default app;
