// Custom error classes for better error handling

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string = 'Validation failed') {
        super(message, 400);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409);
    }
}

export class ExternalAPIError extends AppError {
    constructor(message: string = 'External API error', service?: string) {
        super(service ? `${service}: ${message}` : message, 502);
    }
}

// Alias for payment service
export class ExternalServiceError extends ExternalAPIError {
    constructor(message: string = 'External service error') {
        super(message);
    }
}

