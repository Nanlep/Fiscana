import { createClient } from '@supabase/supabase-js';
import { config } from './index.js';

// Custom fetch with timeout for Node.js
const fetchWithTimeout = (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    return fetch(url, {
        ...options,
        signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
};

// Create Supabase client for authentication and storage
export const supabase = createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: false,
            detectSessionInUrl: false
        },
        global: {
            fetch: fetchWithTimeout
        }
    }
);

// Create admin client with service key for admin operations
export const supabaseAdmin = createClient(
    config.supabase.url,
    config.supabase.serviceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            fetch: fetchWithTimeout
        }
    }
);

export default supabase;
