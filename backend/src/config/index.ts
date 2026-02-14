import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Database
    databaseUrl: process.env.DATABASE_URL || '',
    directUrl: process.env.DIRECT_URL || '',

    // Supabase
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    },

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    jwtExpiresIn: '7d',

    // AI
    geminiApiKey: process.env.GEMINI_API_KEY || '',

    // Bani.africa
    bani: {
        publicKey: process.env.BANI_PUBLIC_KEY || '',
        accessToken: process.env.BANI_ACCESS_TOKEN || '',
        privateKey: process.env.BANI_PRIVATE_KEY || '',
        webhookKey: process.env.BANI_WEBHOOK_KEY || '',
        baseUrl: 'https://live.getbani.com/api/v1',
    },

    // Mono
    mono: {
        publicKey: process.env.MONO_PUBLIC_KEY || '',
        secretKey: process.env.MONO_SECRET_KEY || '',
        baseUrl: 'https://api.withmono.com/v2',
    },

    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
    },
};

// Validate required environment variables
export function validateConfig() {
    const isProduction = process.env.NODE_ENV === 'production';

    const required = [
        'DATABASE_URL',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'JWT_SECRET',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Production-specific security validations
    if (isProduction) {
        // Fail if using default JWT secret
        if (config.jwtSecret === 'change-this-secret-in-production') {
            throw new Error('CRITICAL: JWT_SECRET must be changed for production deployment');
        }

        // Fail if JWT secret is too short
        if (config.jwtSecret.length < 32) {
            throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters for production');
        }

        // Warn about missing optional but recommended keys
        const recommended = ['GEMINI_API_KEY', 'SUPABASE_SERVICE_KEY'];
        const missingRecommended = recommended.filter(key => !process.env[key]);
        if (missingRecommended.length > 0) {
            console.warn(`⚠️ Recommended environment variables not set: ${missingRecommended.join(', ')}`);
        }
    }

    // Use logger in production, console in development
    if (!isProduction) {
        console.log('✓ Configuration validated successfully');
    }
}
