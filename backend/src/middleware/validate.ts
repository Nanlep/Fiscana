import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors.js';

/**
 * Middleware to check validation results
 * Used AFTER express-validator validation chains
 * 
 * Usage:
 * router.post('/route',
 *   [body('field').notEmpty()],  // Validators run first
 *   validate,                     // This checks their results
 *   handler
 * )
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        return next(new ValidationError(errorMessages));
    }

    next();
};
