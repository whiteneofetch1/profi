import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../src/plugins/auth';
import authRoutes from '../src/routes/auth';

describe('E2E Auth Security & Password Recovery Flow', () => {
  let app: FastifyInstance;

  const mockUsers: any[] = [
    {
      id: 'existing-user-id',
      email: 'user@fyxi.ru',
      passwordHash: '$2a$10$e8w.x.sX3/g5p9bJ5b8wO.a1b2c3d4e5f6',
      role: 'DEVELOPER',
      resetToken: null,
      resetTokenExpires: null,
    },
  ];

  const mockPrisma = {
    user: {
      findUnique: async (args: any) => {
        return mockUsers.find(u => u.email === args.where.email) || null;
      },
      findFirst: async (args: any) => {
        return mockUsers.find(u => u.resetToken === args.where.resetToken) || null;
      },
      update: async (args: any) => {
        const user = mockUsers.find(u => u.id === args.where.id);
        if (user) {
          Object.assign(user, args.data);
        }
        return user;
      },
    },
  };

  beforeAll(async () => {
    app = Fastify();
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(authRoutes, { prefix: '/auth' });

    // Register protected admin route for security testing
    app.register(async (fastify) => {
      fastify.addHook('preHandler', fastify.authenticate);
      fastify.get('/admin/protected', async (request, reply) => {
        if (request.user.role !== 'ADMIN') {
          return reply.status(403).send({ error: 'Access forbidden: Admin role required' });
        }
        return { secretData: 'TopSecretAdminData' };
      });
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject requests without authorization token with 401 Unauthorized', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/protected',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should deny non-admin users (CLIENT, DEVELOPER) with 403 Forbidden', async () => {
    const devToken = app.jwt.sign({ id: 'dev-1', email: 'dev@fyxi.ru', role: 'DEVELOPER' });

    const devRes = await app.inject({
      method: 'GET',
      url: '/admin/protected',
      headers: { Cookie: `token=${devToken}` },
    });
    expect(devRes.statusCode).toBe(403);
  });

  it('should handle forgot-password flow and generate a reset token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: 'user@fyxi.ru' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);

    const user = mockUsers.find(u => u.email === 'user@fyxi.ru');
    expect(user.resetToken).toBeDefined();
    expect(user.resetToken).not.toBeNull();
  });

  it('should allow setting a new password via valid reset token', async () => {
    const user = mockUsers.find(u => u.email === 'user@fyxi.ru');
    const token = user.resetToken;

    const response = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: {
        token,
        newPassword: 'newsecurepassword2026',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(user.resetToken).toBeNull();
  });
});
