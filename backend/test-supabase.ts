import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Starting signup test...');

async function testSignup() {
    const email = `testuser${Date.now()}@gmail.com`;
    console.log('Email:', email);

    console.log('Calling supabase.auth.signUp...');
    const startTime = Date.now();

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password: 'Password123',
            options: {
                data: {
                    name: 'Test User',
                    type: 'INDIVIDUAL'
                }
            }
        });

        const elapsed = Date.now() - startTime;
        console.log(`Response received in ${elapsed}ms`);

        if (error) {
            console.log('Error:', error);
        } else {
            console.log('Success! User:', data.user?.email);
            console.log('Session:', data.session ? 'Yes' : 'No');
        }
    } catch (err) {
        console.log('Exception:', err);
    }

    process.exit(0);
}

testSignup();
