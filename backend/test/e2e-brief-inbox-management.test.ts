import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import profileRoutes from '../src/routes/profiles';

describe('E2E Brief Inbox & Project Request Lifecycle', () => {
  let app: FastifyInstance;

  let profilesTable: any[] = [];
  let briefsTable: any[] = [];

  const mockPrisma = {
    devProfile: {
      findMany: async (args: any) => {
        const ids = args?.where?.id?.in || [];
        return profilesTable.filter(p => ids.includes(p.id));
      },
      findFirst: async (args: any) => {
        if (args?.where?.id) return profilesTable.find(p => p.id === args.where.id) || null;
        if (args?.where?.userId) return profilesTable.find(p => p.userId === args.where.userId) || null;
        return profilesTable[0] || null;
      },
      findUnique: async (args: any) => {
        const profile = profilesTable.find(p => p.userId === args?.where?.userId || p.id === args?.where?.id);
        if (!profile) return null;
        return {
          ...profile,
          briefs: briefsTable.filter(b => b.devProfileId === profile.id),
          unlockedItems: [],
          reviews: [],
        };
      },
    },
    projectBrief: {
      create: async (args: any) => {
        const brief = { id: `brief-${Math.random()}`, status: 'NEW', createdAt: new Date(), ...args.data };
        briefsTable.push(brief);
        return brief;
      },
      findMany: async (args: any) => {
        return briefsTable.filter(b => b.devProfileId === args.where?.devProfileId);
      },
      count: async (args: any) => {
        return briefsTable.filter(b => b.devProfileId === args.where?.devProfileId).length;
      },
    },
    review: {
      count: async () => 0,
      aggregate: async () => ({ _avg: { rating: null } }),
      findMany: async () => [],
    },
    unlockedProfile: {
      count: async () => 0,
    },
  };

  beforeEach(async () => {
    profilesTable = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'dev-user-1',
        firstName: 'Артем',
        lastName: 'Смирнов',
        slug: 'artem-smirnov',
        title: 'Tilda Developer',
        specialization: 'Разработка',
      },
    ];
    briefsTable = [];

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(profileRoutes, { prefix: '/profiles' });
  });

  it('should allow a client to send a project brief to specialist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/profiles/brief/send',
      payload: {
        devProfileIds: ['550e8400-e29b-41d4-a716-446655440001'],
        clientName: 'Анна Клюева',
        clientEmail: 'client@brand.ru',
        projectType: 'Интернет-магазин на Tilda',
        budget: '80 000 ₽',
        deadline: '2 недели',
        description: 'Нужен авторский дизайн в Zero Block и подключение СДЭК и ЮKassa.',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(briefsTable.length).toBe(1);
    expect(briefsTable[0].clientName).toBe('Анна Клюева');
  });

  it('should allow authenticated developer to retrieve incoming briefs', async () => {
    await app.inject({
      method: 'POST',
      url: '/profiles/brief/send',
      payload: {
        devProfileIds: ['550e8400-e29b-41d4-a716-446655440001'],
        clientName: 'Анна Клюева',
        clientEmail: 'client@brand.ru',
        projectType: 'Лендинг',
        budget: '50 000 ₽',
        deadline: '1 неделя',
        description: 'Промо лендинг',
      },
    });

    const devToken = app.jwt.sign({ id: 'dev-user-1', role: 'DEVELOPER' });

    const getRes = await app.inject({
      method: 'GET',
      url: '/profiles/my-briefs',
      headers: { Cookie: `token=${devToken}` },
    });

    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.body);
    expect(body.briefs.length).toBe(1);
    expect(body.briefs[0].clientName).toBe('Анна Клюева');
  });

  it('should reflect correct brief count in developer KPI stats endpoint', async () => {
    await app.inject({
      method: 'POST',
      url: '/profiles/brief/send',
      payload: {
        devProfileIds: ['550e8400-e29b-41d4-a716-446655440001'],
        clientName: 'Иван Заказчик',
        clientEmail: 'ivan@client.ru',
        projectType: 'Многостраничник',
        budget: '120 000 ₽',
        deadline: '1 месяц',
        description: 'Корпоративный сайт',
      },
    });

    const devToken = app.jwt.sign({ id: 'dev-user-1', role: 'DEVELOPER' });

    const statsRes = await app.inject({
      method: 'GET',
      url: '/profiles/my-stats',
      headers: { Cookie: `token=${devToken}` },
    });

    expect(statsRes.statusCode).toBe(200);
    const stats = JSON.parse(statsRes.body);
    expect(stats.briefsCount).toBe(1);
  });
});
