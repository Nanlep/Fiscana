import { config } from './src/config/index.js';

console.log('Testing direct HTTP to Supabase...');
console.log('URL:', config.supabase.url);

const email = 'httptest' + Date.now() + '@gmail.com';
console.log('Email:', email);

async function testAuth() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        console.log('Sending request...');
        const start = Date.now();

        const response = await fetch(`${config.supabase.url}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.supabase.anonKey
            },
            body: JSON.stringify({
                email,
                password: 'Password123'
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('Response received in', Date.now() - start, 'ms');
        console.log('Status:', response.status);

        const data = await response.json();
        console.log('Success:', data.user?.id || data.error_code);

    } catch (err: any) {
        clearTimeout(timeoutId);
        console.log('Error:', err.name, err.message);
    }

    process.exit(0);
}

testAuth();
