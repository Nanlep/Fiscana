import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Prevent multiple instances of Prisma Client in development
declare global {
    var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL! + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=10',
        },
    },
});

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

// Test database connection
prisma.$connect()
    .then(() => {
        logger.info('✓ Database connected successfully');
    })
    .catch((error) => {
        logger.error('✗ Database connection failed:', error);
    });

export default prisma;
