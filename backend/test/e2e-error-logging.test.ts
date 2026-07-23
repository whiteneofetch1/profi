import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../src/plugins/auth';
import adminRoutes from '../src/routes/admin';

describe('E2E Diagnostic Error Logging System Tests', () => {
  let app: FastifyInstance;

  const mockErrorLogs: any[] = [];

  const mockPrisma = {
    errorLog: {
      create: async (args: any) => {
        const log = {
          id: 'c3b07384-d113-460a-a000-000000000001',
          message: args.data.message,
          stack: args.data.stack,
          source: args.data.source,
          path: args.data.path,
          level: args.data.level,
          ipAddress: args.data.ipAddress,
          userAgent: args.data.userAgent,
          resolved: false,
          createdAt: new Date(),
        };
        mockErrorLogs.push(log);
        return log;
      },
      findMany: async () => mockErrorLogs,
      update: async (args: any) => {
        const log = mockErrorLogs.find(l => l.id === args.where.id);
        if (log) {
          log.resolved = args.data.resolved;
        }
        return log;
      },
      deleteMany: async () => {
        const initialCount = mockErrorLogs.length;
        const remaining = mockErrorLogs.filter(l => !l.resolved);
        mockErrorLogs.length = 0;
        mockErrorLogs.push(...remaining);
        return { count: initialCount - remaining.length };
      },
    },
  };

  beforeAll(async () => {
    app = Fastify();
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(adminRoutes, { prefix: '/admin' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should accept public client JS error log reports via POST /admin/errors/log', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/admin/errors/log',
      payload: {
        message: 'Vue Error: Uncaught TypeError in Component.vue',
        stack: 'Error: Component failed\n  at Component.render (app.js:123)',
        source: 'FRONTEND',
        path: '/catalog',
        level: 'ERROR',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(mockErrorLogs.length).toBe(1);
    expect(mockErrorLogs[0].message).toContain('Vue Error');
  });

  it('should allow ADMIN to view diagnostic error logs via GET /admin/errors', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-1', email: 'admin@fyxi.ru', role: 'ADMIN' });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/errors',
      headers: { Cookie: `token=${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    const logs = JSON.parse(response.body);
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('should allow ADMIN to mark an error as resolved', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-1', email: 'admin@fyxi.ru', role: 'ADMIN' });
    const targetLogId = 'c3b07384-d113-460a-a000-000000000001';

    const response = await app.inject({
      method: 'PATCH',
      url: `/admin/errors/${targetLogId}/resolve`,
      headers: { Cookie: `token=${adminToken}` },
      payload: { resolved: true },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(mockErrorLogs[0].resolved).toBe(true);
  });

  it('should allow ADMIN to clear resolved errors from the log database', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-1', email: 'admin@fyxi.ru', role: 'ADMIN' });

    const response = await app.inject({
      method: 'DELETE',
      url: '/admin/errors/clear',
      headers: { Cookie: `token=${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(mockErrorLogs.length).toBe(0);
  });
});
