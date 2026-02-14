/**
 * Jest Test Setup
 * Runs before all tests
 */

import { jest, afterAll } from '@jest/globals';
import { prisma } from '../src/config/database.js';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
    await prisma.$disconnect();
});

// Global test utilities
export const testUtils = {
    // Generate random email for testing
    randomEmail: () => `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,

    // Generate random password
    randomPassword: () => `Test${Date.now()}!`,
};

export default testUtils;
