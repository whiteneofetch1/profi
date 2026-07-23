import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import adminRoutes from '../src/routes/admin';

describe('E2E Admin Delete Profile & Moderation Cleanup Lifecycle', () => {
  let app: FastifyInstance;
  let profilesTable: any[] = [];

  const mockPrisma = {
    devProfile: {
      findFirst: async (args: any) => {
        const idOrSlug = args.where?.OR?.[0]?.id || args.where?.id;
        return profilesTable.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
      },
      delete: async (args: any) => {
        const index = profilesTable.findIndex(p => p.id === args.where.id);
        if (index === -1) throw new Error('Profile not found');
        const deleted = profilesTable.splice(index, 1);
        return deleted[0];
      },
    },
    errorLog: { create: async () => ({ id: 'log-1' }) },
  };

  beforeEach(async () => {
    profilesTable = [
      {
        id: '550e8400-e29b-41d4-a716-446655440099',
        slug: 'spam-profile-99',
        firstName: 'Spam',
        lastName: 'User',
        title: 'Fake Developer',
      },
    ];

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(adminRoutes, { prefix: '/admin' });
  });

  it('should allow Superadmin to delete a specialist profile by ID', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/admin/profiles/550e8400-e29b-41d4-a716-446655440099',
      headers: { Cookie: `token=${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(profilesTable.length).toBe(0);
  });

  it('should reject profile deletion request from non-admin users with 403 Forbidden', async () => {
    const devToken = app.jwt.sign({ id: 'user-2', role: 'DEVELOPER' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/admin/profiles/550e8400-e29b-41d4-a716-446655440099',
      headers: { Cookie: `token=${devToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(profilesTable.length).toBe(1);
  });

  it('should return 404 error if target profile to delete does not exist', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/admin/profiles/non-existent-id-12345',
      headers: { Cookie: `token=${adminToken}` },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('не найден');
  });
});
