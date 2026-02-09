import { supabaseAdmin } from '../config/supabase.js';
import { prisma } from '../config/database.js';
import { AuthenticationError, ValidationError, ConflictError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { User } from '@prisma/client';

// Types for auth operations
export interface SignupInput {
    email: string;
    password: string;
    name: string;
    type?: 'INDIVIDUAL' | 'CORPORATE';
    companyName?: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface UpdateProfileInput {
    name?: string;
    type?: 'INDIVIDUAL' | 'CORPORATE';
    companyName?: string;
    tin?: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface UserWithSession {
    user: User;
    session: {
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
    };
}

// Direct HTTP calls to Supabase Auth (bypassing SDK issues)
const SUPABASE_AUTH_URL = `${config.supabase.url}/auth/v1`;

async function supabaseAuthRequest(endpoint: string, body: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    try {
        const response = await fetch(`${SUPABASE_AUTH_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.supabase.anonKey
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            return { data: null, error: data };
        }

        return { data, error: null };
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { data: null, error: { code: 'timeout', message: 'Request timed out' } };
        }
        return { data: null, error: { code: 'network_error', message: error.message } };
    }
}

/**
 * Auth Service - Handles all authentication operations using Supabase Auth
 */
export class AuthService {
    /**
     * Register a new user with Supabase Auth and create a profile in the database
     */
    async signup(input: SignupInput): Promise<AuthResponse> {
        const { email, password, name, type = 'INDIVIDUAL', companyName } = input;

        logger.info('[SIGNUP] Starting signup for:', email);

        // Validate corporate users must have company name
        if (type === 'CORPORATE' && !companyName) {
            throw new ValidationError('Company name is required for corporate accounts');
        }

        logger.info('[SIGNUP] Checking for existing user...');

        // Check if user already exists in our database
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        logger.info('[SIGNUP] Creating Supabase auth user via direct HTTP...');

        // Create user in Supabase Auth using direct HTTP call
        const { data: authData, error: authError } = await supabaseAuthRequest('/signup', {
            email,
            password,
            data: { name, type, companyName }
        });

        logger.info('[SIGNUP] Supabase response received');

        if (authError) {
            logger.error('[SIGNUP] Supabase signup error:', authError);
            const error = new AuthenticationError(authError.msg || authError.message || 'Signup failed');
            (error as any).code = authError.error_code || authError.code || 'auth_error';
            throw error;
        }

        if (!authData.user || !authData.access_token) {
            logger.error('[SIGNUP] No user or token returned from Supabase');
            throw new AuthenticationError('Failed to create user account');
        }

        logger.info('[SIGNUP] Creating user profile in database...');

        // Create user profile in our database
        const user = await prisma.user.create({
            data: {
                id: authData.user.id,
                email,
                name,
                type,
                companyName: type === 'CORPORATE' ? companyName : null,
                role: 'USER',
                kycStatus: 'UNVERIFIED',
                tier: 'TIER_1',
                updatedAt: new Date()
            }
        });

        logger.info(`[SIGNUP] User registered successfully: ${email}`);

        return {
            user,
            accessToken: authData.access_token,
            refreshToken: authData.refresh_token
        };
    }

    /**
     * Login with email and password
     */
    async login(input: LoginInput): Promise<AuthResponse> {
        const { email, password } = input;

        logger.info('[LOGIN] Attempting login for:', email);

        // Authenticate with Supabase using direct HTTP call
        const { data: authData, error: authError } = await supabaseAuthRequest('/token?grant_type=password', {
            email,
            password
        });

        if (authError) {
            logger.warn(`[LOGIN] Login failed for ${email}:`, authError);
            throw new AuthenticationError('Invalid email or password');
        }

        if (!authData.user || !authData.access_token) {
            throw new AuthenticationError('Authentication failed');
        }

        logger.info('[LOGIN] Supabase auth successful, checking database...');

        // Get user profile from database
        let user = await prisma.user.findUnique({
            where: { id: authData.user.id }
        });

        // If user doesn't exist in our DB, create profile
        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: authData.user.id,
                    email: authData.user.email!,
                    name: authData.user.user_metadata?.name || email.split('@')[0],
                    type: authData.user.user_metadata?.type || 'INDIVIDUAL',
                    companyName: authData.user.user_metadata?.companyName,
                    role: 'USER',
                    kycStatus: 'UNVERIFIED',
                    tier: 'TIER_1',
                    updatedAt: new Date()
                }
            });
        }

        logger.info(`[LOGIN] User logged in: ${email}`);

        return {
            user,
            accessToken: authData.access_token,
            refreshToken: authData.refresh_token
        };
    }

    /**
     * Logout user and invalidate session
     */
    async logout(accessToken: string): Promise<void> {
        logger.info('[LOGOUT] User logging out');
        // Note: With direct HTTP, we don't need to call Supabase for logout
        // The client just discards the token
    }

    /**
     * Get current user from access token
     */
    async getCurrentUser(accessToken: string): Promise<User> {
        // Verify token with Supabase
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${SUPABASE_AUTH_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': config.supabase.anonKey
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new AuthenticationError('Invalid or expired token');
            }

            const supabaseUser = await response.json() as { id: string };

            // Get user from database
            const user = await prisma.user.findUnique({
                where: { id: supabaseUser.id }
            });

            if (!user) {
                throw new NotFoundError('User profile not found');
            }

            return user;
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error instanceof AuthenticationError || error instanceof NotFoundError) {
                throw error;
            }
            throw new AuthenticationError('Failed to verify token');
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const { data, error } = await supabaseAuthRequest('/token?grant_type=refresh_token', {
            refresh_token: refreshToken
        });

        if (error || !data.access_token) {
            throw new AuthenticationError('Failed to refresh token');
        }

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token
        };
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            throw new NotFoundError('User not found');
        }

        // Validate corporate users must have company name
        const newType = input.type || existingUser.type;
        if (newType === 'CORPORATE' && !input.companyName && !existingUser.companyName) {
            throw new ValidationError('Company name is required for corporate accounts');
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: input.name,
                type: input.type,
                companyName: input.companyName,
                tin: input.tin,
                updatedAt: new Date()
            }
        });

        // Also update Supabase user metadata
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                name: updatedUser.name,
                type: updatedUser.type,
                companyName: updatedUser.companyName
            }
        });

        logger.info(`[PROFILE] Profile updated for user: ${userId}`);

        return updatedUser;
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<void> {
        await supabaseAuthRequest('/recover', {
            email,
            gotrue_meta_security: {}
        });

        logger.info(`[PASSWORD] Password reset requested for: ${email}`);
    }

    /**
     * Update password
     */
    async updatePassword(accessToken: string, newPassword: string): Promise<void> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${SUPABASE_AUTH_URL}/user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': config.supabase.anonKey
                },
                body: JSON.stringify({ password: newPassword }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json() as { msg?: string };
                throw new AuthenticationError(errorData.msg || 'Failed to update password');
            }

            logger.info('[PASSWORD] Password updated successfully');
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error instanceof AuthenticationError) throw error;
            throw new AuthenticationError('Failed to update password');
        }
    }

    /**
     * Get user by ID (internal use)
     */
    async getUserById(userId: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { id: userId }
        });
    }

    /**
     * Delete user account
     */
    async deleteAccount(userId: string): Promise<void> {
        // Delete from Supabase Auth
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            logger.error(`[DELETE] Failed to delete Supabase user: ${error.message}`);
            throw new AuthenticationError('Failed to delete account');
        }

        // Delete from database (will cascade to all related records)
        await prisma.user.delete({
            where: { id: userId }
        });

        logger.info(`[DELETE] Account deleted: ${userId}`);
    }
}

// Export singleton instance
export const authService = new AuthService();
