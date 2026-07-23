import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../src/plugins/auth';
import profileRoutes from '../src/routes/profiles';
import checkoutRoutes from '../src/routes/checkout';

describe('E2E Short ID Slugs & Dynamic Fallback Routing', () => {
  let app: FastifyInstance;

  const mockProfiles: any[] = [
    {
      id: 'aae529f8-1111-4000-a000-000000000001',
      userId: 'user-sofiya',
      slug: null, // Null slug in database
      firstName: 'София',
      lastName: 'Иванова',
      title: 'Junior Tilda Designer',
      specialization: 'DESIGNER',
      bio: 'Дизайнер сайтов на Tilda Zero Block',
      experienceYears: 2,
      skills: ['Tilda', 'Zero Block', 'Figma'],
      portfolioLinks: [],
      hourlyRate: 1500,
      monthlySalary: 100000,
      availability: 'FREE',
      isVerified: true,
      isApproved: true,
      contactEmail: 'sofiya@fyxi.ru',
      contactTelegram: '@sofiya_design',
      contactPhone: '+79991112233',
      createdAt: new Date(),
      user: { lastActive: new Date() },
    },
    {
      id: '9719fec7-2222-4000-a000-000000000002',
      userId: 'user-ilya',
      slug: null, // Null slug in database
      firstName: 'Илья',
      lastName: 'Макаров',
      title: 'Fullstack Tilda Engineer',
      specialization: 'DEVELOPER',
      bio: 'Дорабатываю сайты на Tilda с помощью кода',
      experienceYears: 4,
      skills: ['JavaScript', 'Zero Block', 'CSS'],
      portfolioLinks: [],
      hourlyRate: 2000,
      monthlySalary: 160000,
      availability: 'OPEN_FOR_OFFERS',
      isVerified: true,
      isApproved: true,
      contactEmail: 'ilya@fyxi.ru',
      contactTelegram: '@ilya_code',
      contactPhone: '+79992223344',
      createdAt: new Date(),
      user: { lastActive: new Date() },
    }
  ];

  const mockReviews: any[] = [];

  const mockPrisma = {
    devProfile: {
      findMany: async () => mockProfiles,
      findFirst: async (args: any) => {
        if (args?.where?.OR) {
          for (const cond of args.where.OR) {
            if (cond.id) {
              const p = mockProfiles.find(item => item.id === cond.id);
              if (p) return p;
            }
            if (cond.slug) {
              const p = mockProfiles.find(item => item.slug === cond.slug);
              if (p) return p;
            }
            if (cond.id?.startsWith) {
              const prefix = cond.id.startsWith;
              const p = mockProfiles.find(item => item.id.startsWith(prefix));
              if (p) return p;
            }
          }
        }
        return null;
      },
      findUnique: async (args: any) => mockProfiles.find(p => p.id === args.where.id) || null,
      upsert: async (args: any) => {
        const existing = mockProfiles.find(p => p.userId === args.where.userId);
        if (existing) {
          Object.assign(existing, args.update);
          return existing;
        }
        const created = { id: 'new-profile-id', userId: args.where.userId, ...args.create };
        mockProfiles.push(created as any);
        return created;
      },
    },
    unlockedProfile: {
      findMany: async () => [],
      findFirst: async (args: any) => {
        if (args?.where?.purchase?.clientId === 'client-1') {
          return { id: 'unlock-record' };
        }
        return null;
      },
    },
    review: {
      findFirst: async (args: any) => {
        return mockReviews.find(r => r.devProfileId === args.where.devProfileId && r.clientId === args.where.clientId) || null;
      },
      create: async (args: any) => {
        const rev = { id: `rev-${Date.now()}`, ...args.data, createdAt: new Date() };
        mockReviews.push(rev);
        return rev;
      },
      update: async (args: any) => {
        const index = mockReviews.findIndex(r => r.id === args.where.id);
        if (index > -1) {
          mockReviews[index] = { ...mockReviews[index], ...args.data };
          return mockReviews[index];
        }
        return null;
      },
      findMany: async (args: any) => mockReviews.filter(r => r.devProfileId === args.where.devProfileId),
    }
  };

  beforeAll(async () => {
    app = Fastify();
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(profileRoutes, { prefix: '/profiles' });
    await app.register(checkoutRoutes, { prefix: '/checkout' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve Sofiya profile via dynamic short ID slug (sofiya-26-ivanova-aae529f8)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles/sofiya-26-ivanova-aae529f8',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe('aae529f8-1111-4000-a000-000000000001');
    expect(body.firstName).toBe('София');
    expect(body.lastName).toBe('Иванова');
  });

  it('should retrieve Ilya profile via dynamic short ID fallback (ilya-29-makarov-9719fec7)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles/ilya-29-makarov-9719fec7',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe('9719fec7-2222-4000-a000-000000000002');
    expect(body.firstName).toBe('Илья');
    expect(body.title).toBe('Fullstack Tilda Engineer');
  });

  it('should allow posting verified customer reviews via short ID slug', async () => {
    const clientToken = app.jwt.sign({ id: 'client-1', role: 'CLIENT' });
    const response = await app.inject({
      method: 'POST',
      url: '/profiles/ilya-29-makarov-9719fec7/reviews',
      headers: { Cookie: `token=${clientToken}` },
      payload: {
        authorName: 'Екатерина (ООO Редизайн)',
        rating: 5,
        comment: 'Шикарный кастомный код в Zero Block! Оценка 5 из 5.',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(mockReviews.length).toBe(1);
    expect(mockReviews[0].devProfileId).toBe('9719fec7-2222-4000-a000-000000000002');
  });

  it('should fetch reviews list for specialist via short ID slug', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles/ilya-29-makarov-9719fec7/reviews',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.reviewCount).toBe(1);
    expect(body.averageRating).toBe(5);
    expect(body.reviews[0].authorName).toBe('Екатерина (ООO Редизайн)');
  });

  it('should return 404 for invalid short ID slug (e.g. unknown-user-12345678)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles/unknown-user-12345678',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Specialist profile not found');
  });

  it('should auto-populate slug on profile creation/update via developer token', async () => {
    const devToken = app.jwt.sign({ id: 'user-new-dev', email: 'newdev@fyxi.ru', role: 'DEVELOPER' });
    
    const response = await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: { Cookie: `token=${devToken}` },
      payload: {
        firstName: 'Артем',
        lastName: 'Зайцев',
        title: 'Senior Animation Expert',
        specialization: 'DESIGNER',
        bio: 'Пошаговая анимация в Zero Block',
        experienceYears: 5,
        skills: ['Zero Block', 'Animation'],
        portfolioLinks: [],
        hourlyRate: 2500,
        monthlySalary: 180000,
        availability: 'FREE',
        contactEmail: 'artem@fyxi.ru',
        contactTelegram: '@artem_anim',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.profile.slug).toContain('artem-zaytsev');
  });
});
