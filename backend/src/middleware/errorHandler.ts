import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log the error
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    // Default to 500 server error
    let statusCode = 500;
    let message = 'Internal server error';

    // If it's our custom AppError, use its properties
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: message,
        code: (err as any).code, // Include error code for frontend error mapping
        ...(config.nodeEnv === 'development' && { stack: err.stack }),
    });
};

// Async handler wrapper to catch async errors
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
