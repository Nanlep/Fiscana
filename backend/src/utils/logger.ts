import { config } from '../config/index.js';

/**
 * Production-ready Logger
 * - JSON format in production for log aggregation
 * - Readable format in development
 * - Filters sensitive data (PII)
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Patterns to redact from logs
const SENSITIVE_PATTERNS = [
    /password['":\s]*['"]?[^'",\s}]+/gi,
    /token['":\s]*['"]?[A-Za-z0-9._-]+/gi,
    /email['":\s]*['"]?[\w.-]+@[\w.-]+/gi,
    /bearer\s+[A-Za-z0-9._-]+/gi,
];

function redactSensitiveData(data: any): any {
    if (typeof data === 'string') {
        let redacted = data;
        SENSITIVE_PATTERNS.forEach(pattern => {
            redacted = redacted.replace(pattern, (match) => {
                const key = match.split(/[:\s'"]+/)[0];
                return `${key}: [REDACTED]`;
            });
        });
        return redacted;
    }

    if (typeof data === 'object' && data !== null) {
        const redacted: any = Array.isArray(data) ? [] : {};
        for (const key in data) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('password') ||
                lowerKey.includes('token') ||
                lowerKey.includes('secret') ||
                lowerKey.includes('authorization')) {
                redacted[key] = '[REDACTED]';
            } else if (lowerKey === 'email' && typeof data[key] === 'string') {
                // Partially redact email
                const email = data[key];
                const [local, domain] = email.split('@');
                redacted[key] = local.substring(0, 2) + '***@' + domain;
            } else {
                redacted[key] = redactSensitiveData(data[key]);
            }
        }
        return redacted;
    }

    return data;
}

class Logger {
    private isProduction = config.nodeEnv === 'production';
    private isDevelopment = config.nodeEnv === 'development';

    private formatMessage(level: LogLevel, message: string, meta?: any): string | object {
        const timestamp = new Date().toISOString();
        const safeMessage = redactSensitiveData(message);
        const safeMeta = meta ? redactSensitiveData(meta) : undefined;

        if (this.isProduction) {
            // JSON format for production log aggregation (CloudWatch, Datadog, etc.)
            return JSON.stringify({
                timestamp,
                level: level.toUpperCase(),
                message: safeMessage,
                ...(safeMeta && { meta: safeMeta }),
            });
        }

        // Readable format for development
        return {
            formatted: `[${timestamp}] [${level.toUpperCase()}] ${safeMessage}`,
            meta: safeMeta,
        };
    }

    private log(level: LogLevel, message: string, meta?: any) {
        const output = this.formatMessage(level, message, meta);

        if (this.isProduction) {
            // In production, output single-line JSON
            if (level === 'error') {
                console.error(output);
            } else if (level === 'warn') {
                console.warn(output);
            } else {
                console.log(output);
            }
        } else {
            // In development, readable output
            const { formatted, meta: safeMeta } = output as { formatted: string; meta?: any };
            if (safeMeta) {
                console[level](formatted, safeMeta);
            } else {
                console[level](formatted);
            }
        }
    }

    info(message: string, meta?: any) {
        this.log('info', message, meta);
    }

    warn(message: string, meta?: any) {
        this.log('warn', message, meta);
    }

    error(message: string, meta?: any) {
        this.log('error', message, meta);
    }

    debug(message: string, meta?: any) {
        if (this.isDevelopment) {
            this.log('debug', message, meta);
        }
    }

    // Request logging for middleware
    request(method: string, url: string, statusCode: number, durationMs: number, meta?: any) {
        this.info(`${method} ${url} ${statusCode} ${durationMs}ms`, {
            type: 'request',
            method,
            url,
            statusCode,
            durationMs,
            ...meta,
        });
    }
}

export const logger = new Logger();
export default logger;
