import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Prevent multiple instances of Prisma Client in development
declare global {
    var prisma: PrismaClient | undefined;
}

// Build the database URL — append Prisma connection pool params to cap memory usage.
// In Prisma v5, `datasourceUrl` is the correct constructor API; the old `datasources`
// key was silently ignored which caused the pool cap to have no effect.
const buildDatabaseUrl = () => {
    const base = process.env.DATABASE_URL;
    if (!base) return '';
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}connection_limit=3&pool_timeout=10`;
};

export const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasourceUrl: buildDatabaseUrl(),
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
