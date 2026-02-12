/**
 * Seed Admin User Script
 * Creates an admin user in both Supabase Auth and the Prisma database.
 * 
 * Usage: npx tsx scripts/seedAdmin.ts
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env');
    process.exit(1);
}

async function seedAdmin() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
        process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const prisma = new PrismaClient();

    try {
        console.log(`\n🔧 Creating admin user: ${ADMIN_EMAIL}\n`);

        // Step 1: Create user in Supabase Auth
        console.log('1️⃣  Creating user in Supabase Auth...');
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true, // Auto-confirm email so they can log in immediately
            user_metadata: {
                name: ADMIN_NAME,
                role: 'ADMIN'
            }
        });

        if (authError) {
            // If user already exists, try to get their ID
            if (authError.message?.includes('already') || authError.message?.includes('exists')) {
                console.log('   ⚠️  User already exists in Supabase Auth, fetching existing user...');
                const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = listData?.users?.find(u => u.email === ADMIN_EMAIL);
                if (existingUser) {
                    console.log(`   ✅ Found existing auth user: ${existingUser.id}`);
                    // Update password just in case
                    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                        password: ADMIN_PASSWORD,
                        email_confirm: true
                    });
                    console.log('   ✅ Password updated');
                    // Continue to create/update in Prisma
                    await upsertPrismaUser(prisma, existingUser.id);
                    return;
                }
            }
            throw new Error(`Supabase Auth error: ${authError.message}`);
        }

        const userId = authData.user.id;
        console.log(`   ✅ Supabase user created: ${userId}`);

        // Step 2: Create user in Prisma database
        await upsertPrismaUser(prisma, userId);

    } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}`);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function upsertPrismaUser(prisma: PrismaClient, userId: string) {
    console.log('2️⃣  Creating/updating user in database...');

    const user = await prisma.user.upsert({
        where: { id: userId },
        update: {
            role: 'ADMIN',
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
        },
        create: {
            id: userId,
            email: ADMIN_EMAIL,
            name: ADMIN_NAME,
            role: 'ADMIN',
            type: 'INDIVIDUAL',
            kycStatus: 'VERIFIED',
            tier: 'PRO',
        }
    });

    console.log(`   ✅ Database user ready: ${user.email} (role: ${user.role})`);
    console.log(`\n🎉 Admin account created successfully!`);
    console.log(`\n   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role:     ADMIN\n`);
}

seedAdmin();
