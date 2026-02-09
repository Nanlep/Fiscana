import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { prisma } from '../config/database.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import type { User } from '@prisma/client';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

/**
 * Middleware to verify Supabase JWT token and attach user to request
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthenticationError('No token provided');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token with Supabase
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (error || !supabaseUser) {
            throw new AuthenticationError('Invalid or expired token');
        }

        // Get full user profile from database
        const user = await prisma.user.findUnique({
            where: { id: supabaseUser.id }
        });

        if (!user) {
            throw new AuthenticationError('User profile not found');
        }

        // Attach user to request
        req.user = user;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AuthenticationError('User not authenticated'));
            return;
        }

        if (!roles.includes(req.user.role)) {
            next(new AuthorizationError('Insufficient permissions'));
            return;
        }

        next();
    };
};

/**
 * Optional authentication - doesn't throw if no token, just sets user to undefined
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token, continue without user
            next();
            return;
        }

        const token = authHeader.substring(7);

        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (!error && supabaseUser) {
            const user = await prisma.user.findUnique({
                where: { id: supabaseUser.id }
            });
            req.user = user || undefined;
        }

        next();
    } catch (error) {
        // Don't throw, just continue without user
        next();
    }
};
