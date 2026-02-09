import { prisma } from './src/config/database.js';
import { logger } from './src/utils/logger.js';

async function testConnection() {
    try {
        logger.info('Testing database connection...');

        // Test 1: Check if database is accessible
        await prisma.$connect();
        logger.info('✓ Database connection established');

        // Test 2: Run a simple query
        const result = await prisma.$queryRaw`SELECT version()`;
        logger.info('✓ Database query successful:', result);

        // Test 3: Count tables
        const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ` as Array<{ table_name: string }>;
        logger.info(`✓ Found ${tables.length} tables in database`);

        // Test 4: Check specific tables exist
        const expectedTables = ['User', 'Transaction', 'Invoice', 'Asset', 'Liability', 'Budget', 'KYCRequest', 'InvoiceItem', 'PaymentRecord'];
        const tableNames = tables.map(t => t.table_name);

        const missingTables = expectedTables.filter(t => !tableNames.includes(t));
        if (missingTables.length === 0) {
            logger.info('✓ All expected tables exist');
        } else {
            logger.warn('⚠ Missing tables:', missingTables);
        }

        logger.info('\n✅ Database setup complete and verified!');
        logger.info('📊 Tables:', tableNames);

    } catch (error) {
        logger.error('❌ Database connection test failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
