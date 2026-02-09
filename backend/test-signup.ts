import { supabase } from './src/config/supabase.js';

async function testSignup() {
    const email = 'testfix' + Date.now() + '@gmail.com';
    console.log('Testing with email:', email);
    console.log('Starting...');

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password: 'Password123',
            options: { data: { name: 'Test' } }
        });

        if (error) {
            console.log('Auth Error:', error.code, error.message);
        } else {
            console.log('SUCCESS! User ID:', data.user?.id);
            console.log('Session:', data.session ? 'Yes' : 'No');
        }
    } catch (e: any) {
        console.log('Exception:', e.name, e.message);
    }
    process.exit(0);
}

testSignup();
