import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../src/plugins/auth';
import profileRoutes from '../src/routes/profiles';

describe('E2E Specialist Reviews & Project Brief Dispatch Lifecycle', () => {
  let app: FastifyInstance;

  const mockReviews: any[] = [];

  const mockPrisma = {
    devProfile: {
      findUnique: async (args: any) => {
        if (args.where.id === 'c3b07384-d113-460a-a000-000000000001') {
          return { id: args.where.id, firstName: 'Алексей', lastName: 'Петров', title: 'Senior Tilda Dev' };
        }
        return null;
      },
      findMany: async (args: any) => {
        return args.where.id.in.map((id: string) => ({
          id,
          firstName: 'Мария',
          lastName: 'Иванова',
          title: 'UI/UX Art Director',
        }));
      },
    },
    review: {
      create: async (args: any) => {
        const review = {
          id: `rev-${Date.now()}`,
          devProfileId: args.data.devProfileId,
          authorName: args.data.authorName,
          rating: args.data.rating,
          comment: args.data.comment,
          isVerified: args.data.isVerified,
          createdAt: new Date(),
        };
        mockReviews.push(review);
        return review;
      },
      findMany: async () => mockReviews,
    },
  };

  beforeAll(async () => {
    app = Fastify();
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(profileRoutes, { prefix: '/profiles' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should post a verified customer review for a specialist profile', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/profiles/c3b07384-d113-460a-a000-000000000001/reviews',
      payload: {
        authorName: 'Михаил (ООО Вектор)',
        rating: 5,
        comment: 'Превосходная работа по разработке промо-сайта на Tilda Zero Block!',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(mockReviews.length).toBe(1);
    expect(mockReviews[0].rating).toBe(5);
  });

  it('should fetch reviews and compute average rating for specialist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles/c3b07384-d113-460a-a000-000000000001/reviews',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.reviewCount).toBe(1);
    expect(body.averageRating).toBe(5);
    expect(body.reviews[0].comment).toContain('Tilda Zero Block');
  });

  it('should dispatch an instant project brief to selected specialists', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/profiles/brief/send',
      payload: {
        devProfileIds: ['c3b07384-d113-460a-a000-000000000001'],
        clientName: 'Анна Васильева',
        clientEmail: 'anna@corporate.ru',
        projectType: 'Интернет-магазин на Tilda',
        budget: '150 000 ₽',
        deadline: '2 недели',
        description: 'Нужен редизайн существующего магазина и настройка каталога.',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });
});
