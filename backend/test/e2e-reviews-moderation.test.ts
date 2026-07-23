import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import profileRoutes from '../src/routes/profiles';

describe('E2E Reviews & Specialist Rating Lifecycle', () => {
  let app: FastifyInstance;

  let profilesTable: any[] = [];
  let reviewsTable: any[] = [];

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
    unlockedProfile: {
      findFirst: async () => ({ id: 'unlocked-1', devProfileId: '550e8400-e29b-41d4-a716-446655440001' }),
      count: async () => 0,
    },
    review: {
      create: async (args: any) => {
        const r = { id: `rev-${Math.random()}`, createdAt: new Date(), ...args.data };
        reviewsTable.push(r);
        return r;
      },
      findFirst: async () => null,
      findMany: async (args: any) => {
        return reviewsTable.filter(r => r.devProfileId === args.where?.devProfileId);
      },
      count: async (args: any) => {
        return reviewsTable.filter(r => r.devProfileId === args.where?.devProfileId).length;
      },
      aggregate: async (args: any) => {
        const list = reviewsTable.filter(r => r.devProfileId === args.where?.devProfileId);
        if (list.length === 0) return { _avg: { rating: null } };
        const sum = list.reduce((acc, curr) => acc + curr.rating, 0);
        return { _avg: { rating: sum / list.length } };
      },
    },
    projectBrief: { count: async () => 0 },
  };

  beforeEach(async () => {
    profilesTable = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'dev-user-1',
        firstName: 'Елена',
        lastName: 'Воронова',
        slug: 'elena-voronova',
        title: 'UI/UX Designer',
      },
    ];
    reviewsTable = [];

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(profileRoutes, { prefix: '/profiles' });
  });

  it('should allow an authenticated client to post a review for unlocked specialist', async () => {
    const clientToken = app.jwt.sign({ id: 'client-user-1', role: 'CLIENT' });

    const res = await app.inject({
      method: 'POST',
      url: '/profiles/550e8400-e29b-41d4-a716-446655440001/reviews',
      headers: { Cookie: `token=${clientToken}` },
      payload: {
        authorName: 'Михаил',
        rating: 5,
        comment: 'Отличный специалист! Сделала Zero Block дизайн точно в срок и настроила Step-by-Step анимацию.',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(reviewsTable.length).toBe(1);
    expect(reviewsTable[0].rating).toBe(5);
  });

  it('should retrieve reviews and average rating for a profile', async () => {
    reviewsTable.push({
      id: 'r1',
      devProfileId: '550e8400-e29b-41d4-a716-446655440001',
      authorName: 'Ольга',
      rating: 5,
      comment: 'Супер!',
      createdAt: new Date(),
    });
    reviewsTable.push({
      id: 'r2',
      devProfileId: '550e8400-e29b-41d4-a716-446655440001',
      authorName: 'Дмитрий',
      rating: 4,
      comment: 'Хорошо сделано',
      createdAt: new Date(),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/profiles/550e8400-e29b-41d4-a716-446655440001/reviews',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.reviews.length).toBe(2);
    expect(body.averageRating).toBe(4.5);
  });

  it('should allow developer to view their own reviews in cabinet endpoint', async () => {
    reviewsTable.push({
      id: 'r1',
      devProfileId: '550e8400-e29b-41d4-a716-446655440001',
      authorName: 'Клиент',
      rating: 5,
      comment: 'Рекомендую!',
      createdAt: new Date(),
    });

    const devToken = app.jwt.sign({ id: 'dev-user-1', role: 'DEVELOPER' });

    const res = await app.inject({
      method: 'GET',
      url: '/profiles/my-reviews',
      headers: { Cookie: `token=${devToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.reviews.length).toBe(1);
    expect(body.count).toBe(1);
  });
});
