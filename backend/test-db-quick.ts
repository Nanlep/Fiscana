import { prisma } from './src/config/database.js';

console.log('Testing database connection...');
const start = Date.now();

async function test() {
    try {
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        console.log('DB OK! Time:', Date.now() - start, 'ms');
        console.log('Result:', result);
    } catch (err) {
        console.log('DB Error:', err);
    }
    process.exit(0);
}

test();

setTimeout(() => {
    console.log('TIMEOUT after 10s!');
    process.exit(1);
}, 10000);
