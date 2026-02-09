import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { authService } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post(
    '/signup',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/)
            .withMessage('Password must contain at least one uppercase letter')
            .matches(/[a-z]/)
            .withMessage('Password must contain at least one lowercase letter')
            .matches(/[0-9]/)
            .withMessage('Password must contain at least one number'),
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('type').optional().isIn(['INDIVIDUAL', 'CORPORATE']).withMessage('Type must be INDIVIDUAL or CORPORATE'),
        body('companyName').optional().trim()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { email, password, name, type, companyName } = req.body;

        const result = await authService.signup({
            email,
            password,
            name,
            type,
            companyName
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    type: result.user.type,
                    role: result.user.role,
                    kycStatus: result.user.kycStatus,
                    tier: result.user.tier
                },
                accessToken: result.accessToken,
                refreshToken: result.refreshToken
            }
        });
    })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body;

        const result = await authService.login({ email, password });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    type: result.user.type,
                    companyName: result.user.companyName,
                    role: result.user.role,
                    kycStatus: result.user.kycStatus,
                    tier: result.user.tier
                },
                accessToken: result.accessToken,
                refreshToken: result.refreshToken
            }
        });
    })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
    '/logout',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1] || '';

        await authService.logout(token);

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
    '/me',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const user = req.user!;

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                type: user.type,
                companyName: user.companyName,
                role: user.role,
                kycStatus: user.kycStatus,
                tier: user.tier,
                tin: user.tin,
                createdAt: user.createdAt
            }
        });
    })
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
    '/profile',
    authenticate,
    [
        body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
        body('type').optional().isIn(['INDIVIDUAL', 'CORPORATE']).withMessage('Type must be INDIVIDUAL or CORPORATE'),
        body('companyName').optional().trim(),
        body('tin').optional().trim()
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { name, type, companyName, tin } = req.body;

        const updatedUser = await authService.updateProfile(userId, {
            name,
            type,
            companyName,
            tin
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                type: updatedUser.type,
                companyName: updatedUser.companyName,
                role: updatedUser.role,
                kycStatus: updatedUser.kycStatus,
                tier: updatedUser.tier,
                tin: updatedUser.tin
            }
        });
    })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post(
    '/refresh',
    [
        body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { refreshToken } = req.body;

        const tokens = await authService.refreshToken(refreshToken);

        res.json({
            success: true,
            data: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            }
        });
    })
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post(
    '/forgot-password',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body;

        await authService.requestPasswordReset(email);

        // Always return success to prevent email enumeration
        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent'
        });
    })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public (requires valid reset token from email)
 */
router.post(
    '/reset-password',
    [
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/)
            .withMessage('Password must contain at least one uppercase letter')
            .matches(/[a-z]/)
            .withMessage('Password must contain at least one lowercase letter')
            .matches(/[0-9]/)
            .withMessage('Password must contain at least one number')
    ],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Authorization token required'
            });
            return;
        }

        const { password } = req.body;
        await authService.updatePassword(token, password);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    })
);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete(
    '/account',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        await authService.deleteAccount(userId);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    })
);

export default router;
