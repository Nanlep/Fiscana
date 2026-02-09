/**
 * Auth API Integration Tests
 */

import request from 'supertest';
import app from '../src/index.js';
import { testUtils } from './setup.js';

describe('Auth API', () => {
    describe('POST /api/auth/signup', () => {
        it('should create a new user with valid data', async () => {
            const email = testUtils.randomEmail();
            const password = testUtils.randomPassword();

            const response = await request(app)
                .post('/api/auth/signup')
                .send({
                    email,
                    password,
                    name: 'Test User',
                    type: 'INDIVIDUAL'
                })
                .expect('Content-Type', /json/);

            // Note: May return 201 (success) or 429 (rate limit) depending on Supabase limits
            expect([201, 429]).toContain(response.status);

            if (response.status === 201) {
                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('user');
                expect(response.body.data).toHaveProperty('accessToken');
                expect(response.body.data.user.email).toBe(email);
            }
        });

        it('should reject signup with invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'invalid-email',
                    password: 'Password123!',
                    name: 'Test User'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should reject signup with weak password', async () => {
            const response = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: testUtils.randomEmail(),
                    password: '123',  // Too short
                    name: 'Test User'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should reject login with invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'WrongPassword123!'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should reject login without password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/auth/profile', () => {
        it('should reject request without token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalid_token_here')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});

describe('Health Check', () => {
    it('should return health status', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Fiscana API is running');
    });
});
