import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import adminRoutes from '../src/routes/admin';

describe('E2E Admin CMS Edge Cases & Security Firewall Tests', () => {
  let app: FastifyInstance;

  let profilesTable: any[] = [];
  let configTable: any[] = [];

  const mockPrisma = {
    devProfile: {
      findMany: async () => profilesTable,
      update: async (args: any) => {
        const index = profilesTable.findIndex(p => p.id === args.where.id);
        if (index === -1) throw new Error('Profile not found');
        profilesTable[index] = { ...profilesTable[index], ...args.data };
        return profilesTable[index];
      },
    },
    platformConfig: {
      findFirst: async () => configTable[0] || null,
      create: async (args: any) => {
        const c = { id: 'cfg-1', ...args.data };
        configTable.push(c);
        return c;
      },
      update: async (args: any) => {
        configTable[0] = { ...configTable[0], ...args.data };
        return configTable[0];
      },
    },
    errorLog: {
      create: async (args: any) => ({ id: 'log-1', ...args.data }),
    },
  };

  beforeEach(async () => {
    profilesTable = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        firstName: 'Иван',
        lastName: 'Петров',
        isApproved: false,
        isVerified: false,
        user: { email: 'ivan@fyxi.ru', lastActive: new Date() },
      },
    ];
    configTable = [];

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(adminRoutes, { prefix: '/admin' });
  });

  it('should allow public client error logging without admin auth header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/errors/log',
      payload: {
        message: 'Uncaught TypeError: Cannot read properties of undefined',
        stack: 'Error: at VueComponent.render',
        source: 'FRONTEND',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('should reject non-admin users attempting to access /admin/profiles', async () => {
    const devToken = app.jwt.sign({ id: 'user-1', role: 'DEVELOPER' });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/profiles',
      headers: { Cookie: `token=${devToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toContain('Forbidden');
  });

  it('should allow admin to update verified badge status on specialist profile', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-id', role: 'ADMIN' });

    const res = await app.inject({
      method: 'POST',
      url: '/admin/profiles/550e8400-e29b-41d4-a716-446655440001/verify',
      headers: { Cookie: `token=${adminToken}` },
      payload: { isVerified: true },
    });

    expect(res.statusCode).toBe(200);
    expect(profilesTable[0].isVerified).toBe(true);
  });

  it('should get and update platform pricing configuration', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-id', role: 'ADMIN' });

    const getRes = await app.inject({
      method: 'GET',
      url: '/admin/config',
      headers: { Cookie: `token=${adminToken}` },
    });

    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).flatRatePrice).toBe(500);

    const updateRes = await app.inject({
      method: 'POST',
      url: '/admin/config',
      headers: { Cookie: `token=${adminToken}` },
      payload: {
        flatRatePrice: 2990,
        bundleCount: 3,
        bundlePrice: 1990,
      },
    });

    expect(updateRes.statusCode).toBe(200);
    expect(configTable[0].flatRatePrice).toBe(2990);
  });
});
