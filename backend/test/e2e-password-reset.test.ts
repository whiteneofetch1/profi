import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import authPlugin from '../src/plugins/auth';
import authRoutes from '../src/routes/auth';

describe('E2E Password Reset & Security Token Lifecycle', () => {
  let app: FastifyInstance;

  let testUser: any = {
    id: 'user-reset-100',
    email: 'specialist@fyxi.ru',
    passwordHash: '',
    role: 'DEVELOPER',
    resetToken: null,
    resetTokenExpires: null,
  };

  const mockPrisma = {
    user: {
      findUnique: async (args: any) => {
        if (args.where.email === testUser.email) return testUser;
        return null;
      },
      findFirst: async (args: any) => {
        if (testUser.resetToken && args.where.resetToken === testUser.resetToken) {
          return testUser;
        }
        return null;
      },
      update: async (args: any) => {
        Object.assign(testUser, args.data);
        return testUser;
      },
    },
  };

  beforeAll(async () => {
    testUser.passwordHash = await bcrypt.hash('oldPassword123', 10);

    app = Fastify();
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(authRoutes, { prefix: '/auth' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process forgot-password request for valid user email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: 'specialist@fyxi.ru' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(testUser.resetToken).not.toBeNull();
    expect(testUser.resetTokenExpires).toBeDefined();
  });

  it('should reset password when valid token is supplied', async () => {
    const validToken = testUser.resetToken;

    const response = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: {
        token: validToken,
        newPassword: 'BrandNewSecurePass2026',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);

    // Verify token was cleared
    expect(testUser.resetToken).toBeNull();

    // Verify new password works with bcrypt
    const isValid = await bcrypt.compare('BrandNewSecurePass2026', testUser.passwordHash);
    expect(isValid).toBe(true);
  });

  it('should reject password reset if token is invalid or expired', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: {
        token: 'invalid_expired_token_xyz',
        newPassword: 'SomePassword123',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('недействительна');
  });
});
