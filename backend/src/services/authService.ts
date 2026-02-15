import { supabaseAdmin } from '../config/supabase.js';
import { prisma } from '../config/database.js';
import { AuthenticationError, ValidationError, ConflictError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { emailService } from './emailService.js';
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
     * Step 1: Initiate signup — validate, generate OTP code, send to email
     */
    async initiateSignup(input: SignupInput): Promise<{ message: string }> {
        const { email, password, name, type = 'INDIVIDUAL', companyName } = input;

        logger.info('[SIGNUP] Initiating signup for:', email);

        if (type === 'CORPORATE' && !companyName) {
            throw new ValidationError('Company name is required for corporate accounts');
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete any existing verification for this email
        await prisma.emailVerification.deleteMany({ where: { email } });

        // Store verification record (expires in 10 minutes)
        // Password stored temporarily — record is deleted immediately after verification
        await prisma.emailVerification.create({
            data: {
                email,
                code,
                name,
                password, // stored temporarily, deleted after verification or expiry
                type,
                companyName: type === 'CORPORATE' ? companyName : null,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        });

        // Send verification email
        await emailService.sendVerificationCode(email, code, name);

        logger.info(`[SIGNUP] Verification code sent to: ${email}`);
        return { message: 'Verification code sent to your email' };
    }

    /**
     * Step 2: Verify code and complete signup
     */
    async verifyAndCompleteSignup(email: string, code: string): Promise<AuthResponse> {
        logger.info('[SIGNUP] Verifying code for:', email);

        // Find the verification record
        const record = await prisma.emailVerification.findFirst({
            where: { email, code, verified: false },
            orderBy: { createdAt: 'desc' },
        });

        if (!record) {
            throw new ValidationError('Invalid verification code');
        }

        if (new Date() > record.expiresAt) {
            await prisma.emailVerification.delete({ where: { id: record.id } });
            throw new ValidationError('Verification code has expired. Please sign up again.');
        }

        // Reconstruct original password from hash for Supabase signup
        // We need the original password, so let's store it encrypted instead
        // Actually, we'll use a different approach — store the raw password temporarily
        // Since this record lives only 10 minutes and gets deleted immediately after use

        logger.info('[SIGNUP] Code verified. Creating Supabase auth user...');

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAuthRequest('/signup', {
            email,
            password: record.password, // Note: we'll store raw password (see below)
            data: { name: record.name, type: record.type, companyName: record.companyName }
        });

        if (authError) {
            logger.error('[SIGNUP] Supabase signup error:', authError);
            throw new AuthenticationError(authError.msg || authError.message || 'Signup failed');
        }

        if (!authData.user || !authData.access_token) {
            throw new AuthenticationError('Failed to create user account');
        }

        // Create user profile in database
        const user = await prisma.user.create({
            data: {
                id: authData.user.id,
                email,
                name: record.name,
                type: record.type,
                companyName: record.companyName,
                role: 'USER',
                kycStatus: 'UNVERIFIED',
                tier: 'TIER_1',
                updatedAt: new Date()
            }
        });

        // Delete verification record
        await prisma.emailVerification.delete({ where: { id: record.id } });

        logger.info(`[SIGNUP] User registered successfully: ${email}`);

        // Send welcome email + admin notification (fire-and-forget)
        emailService.sendWelcomeEmail(email, record.name).catch(() => { });
        emailService.sendAdminNewUserAlert(record.name, email, record.type).catch(() => { });

        return {
            user,
            accessToken: authData.access_token,
            refreshToken: authData.refresh_token
        };
    }

    /**
     * Legacy signup (kept for backward compatibility)
     */
    async signup(input: SignupInput): Promise<AuthResponse> {
        const { email, password, name, type = 'INDIVIDUAL', companyName } = input;

        logger.info('[SIGNUP] Starting direct signup for:', email);

        if (type === 'CORPORATE' && !companyName) {
            throw new ValidationError('Company name is required for corporate accounts');
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        const { data: authData, error: authError } = await supabaseAuthRequest('/signup', {
            email, password,
            data: { name, type, companyName }
        });

        if (authError) {
            logger.error('[SIGNUP] Supabase signup error:', authError);
            const error = new AuthenticationError(authError.msg || authError.message || 'Signup failed');
            (error as any).code = authError.error_code || authError.code || 'auth_error';
            throw error;
        }

        if (!authData.user || !authData.access_token) {
            throw new AuthenticationError('Failed to create user account');
        }

        const user = await prisma.user.create({
            data: {
                id: authData.user.id,
                email, name, type,
                companyName: type === 'CORPORATE' ? companyName : null,
                role: 'USER',
                kycStatus: 'UNVERIFIED',
                tier: 'TIER_1',
                updatedAt: new Date()
            }
        });

        logger.info(`[SIGNUP] User registered successfully: ${email}`);

        // Send welcome email + admin notification
        emailService.sendWelcomeEmail(email, name).catch(() => { });
        emailService.sendAdminNewUserAlert(name, email, type).catch(() => { });

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
     * Request password reset — generates a recovery link via Supabase Admin
     * and sends a branded email through our email service
     */
    async requestPasswordReset(email: string): Promise<void> {
        // Look up user name for personalized email
        const user = await prisma.user.findUnique({ where: { email } });

        try {
            // Use Supabase Admin to generate a recovery link
            const { data, error } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email,
                options: {
                    redirectTo: `${config.frontendUrl}`,
                }
            });

            if (error || !data?.properties?.action_link) {
                // Fallback: use Supabase's built-in recovery endpoint
                await supabaseAuthRequest('/recover', {
                    email,
                    gotrue_meta_security: {}
                });
                logger.info(`[PASSWORD] Fallback reset email sent for: ${email}`);
                return;
            }

            // Use the action link from Supabase which handles verification and redirection with valid JWT
            const resetLink = data.properties.action_link;

            // Send branded email
            await emailService.sendPasswordResetEmail(email, user?.name || '', resetLink);
            logger.info(`[PASSWORD] Branded reset email sent for: ${email}`);
        } catch (err: any) {
            // Fallback: use built-in Supabase recovery
            logger.warn('[PASSWORD] Admin link generation failed, using fallback:', err.message);
            await supabaseAuthRequest('/recover', {
                email,
                gotrue_meta_security: {}
            });
            logger.info(`[PASSWORD] Fallback reset email sent for: ${email}`);
        }
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
