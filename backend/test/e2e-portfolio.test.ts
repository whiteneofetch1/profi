import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import profileRoutes from '../src/routes/profiles';

describe('E2E Portfolio Cases Lifecycle', () => {
  let app: FastifyInstance;

  let profilesTable: any[] = [];
  let casesTable: any[] = [];

  const mockPrisma = {
    devProfile: {
      findFirst: async (args: any) => {
        if (args?.where?.id) return profilesTable.find(p => p.id === args.where.id) || null;
        if (args?.where?.userId) return profilesTable.find(p => p.userId === args.where.userId) || null;
        return profilesTable[0] || null;
      },
      findUnique: async (args: any) => {
        if (args?.where?.id) return profilesTable.find(p => p.id === args.where.id) || null;
        if (args?.where?.userId) return profilesTable.find(p => p.userId === args.where.userId) || null;
        return null;
      },
    },
    portfolioCase: {
      create: async (args: any) => {
        const c = { id: `case-${Math.random()}`, createdAt: new Date(), ...args.data };
        casesTable.push(c);
        return c;
      },
      findMany: async (args: any) => {
        return casesTable.filter(c => c.devProfileId === args.where?.devProfileId).sort((a, b) => a.order - b.order);
      },
      findUnique: async (args: any) => {
        return casesTable.find(c => c.id === args.where?.id) || null;
      },
      update: async (args: any) => {
        const idx = casesTable.findIndex(c => c.id === args.where?.id);
        if (idx === -1) throw new Error('Not found');
        casesTable[idx] = { ...casesTable[idx], ...args.data };
        return casesTable[idx];
      },
      delete: async (args: any) => {
        const idx = casesTable.findIndex(c => c.id === args.where?.id);
        if (idx !== -1) casesTable.splice(idx, 1);
        return { count: 1 };
      }
    },
  };

  beforeEach(async () => {
    profilesTable = [
      {
        id: 'dev-profile-1',
        userId: 'dev-user-1',
        firstName: 'Иван',
        lastName: 'Петров',
        slug: 'ivan-petrov',
        title: 'Frontend Developer',
      },
    ];
    casesTable = [];

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(profileRoutes, { prefix: '/profiles' });
  });

  it('should allow developer to add a portfolio case', async () => {
    const devToken = app.jwt.sign({ id: 'dev-user-1', role: 'DEVELOPER', devProfileId: 'dev-profile-1' });

    const res = await app.inject({
      method: 'POST',
      url: '/profiles/my-cases',
      headers: { Cookie: `token=${devToken}` },
      payload: {
        title: 'Project A',
        description: 'Cool project',
        techStack: ['Vue', 'Nuxt'],
        link: 'https://example.com',
        order: 1
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.title).toBe('Project A');
    expect(casesTable.length).toBe(1);
    expect(casesTable[0].techStack).toEqual(['Vue', 'Nuxt']);
  });

  it('should allow developer to update a portfolio case', async () => {
    casesTable.push({
      id: 'case-1',
      devProfileId: 'dev-profile-1',
      title: 'Old Title',
      description: 'Old Description',
      techStack: [],
      order: 1
    });

    const devToken = app.jwt.sign({ id: 'dev-user-1', role: 'DEVELOPER', devProfileId: 'dev-profile-1' });

    const res = await app.inject({
      method: 'PUT',
      url: '/profiles/my-cases/case-1',
      headers: { Cookie: `token=${devToken}` },
      payload: {
        title: 'New Title',
        description: 'New Description',
        techStack: ['React'],
        order: 2
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.title).toBe('New Title');
    expect(casesTable[0].title).toBe('New Title');
    expect(casesTable[0].order).toBe(2);
  });

  it('should allow developer to delete a portfolio case', async () => {
    casesTable.push({
      id: 'case-1',
      devProfileId: 'dev-profile-1',
      title: 'To Be Deleted',
    });

    const devToken = app.jwt.sign({ id: 'dev-user-1', role: 'DEVELOPER', devProfileId: 'dev-profile-1' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/profiles/my-cases/case-1',
      headers: { Cookie: `token=${devToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(casesTable.length).toBe(0);
  });

  it('should forbid client from adding portfolio case', async () => {
    const clientToken = app.jwt.sign({ id: 'client-1', role: 'CLIENT' });

    const res = await app.inject({
      method: 'POST',
      url: '/profiles/my-cases',
      headers: { Cookie: `token=${clientToken}` },
      payload: { title: 'Not allowed' },
    });

    expect(res.statusCode).toBe(403);
    expect(casesTable.length).toBe(0);
  });
});
