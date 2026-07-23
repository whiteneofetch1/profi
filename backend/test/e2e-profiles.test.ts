import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../src/plugins/auth';
import profileRoutes from '../src/routes/profiles';
import adminRoutes from '../src/routes/admin';

describe('E2E Specialist Profiles & Moderation Lifecycle', () => {
  let app: FastifyInstance;

  const mockProfiles: any[] = [
    {
      id: 'd3b07384-d113-460a-a000-000000000001',
      userId: 'user-1',
      firstName: 'Алексей',
      lastName: 'Смирнов',
      title: 'Senior Tilda Developer & Zero Block Expert',
      specialization: 'DEVELOPER',
      hourlyRate: 1500,
      monthlyRate: 180000,
      experienceYears: 5,
      avatarSymbol: '⚡️',
      bio: 'Разрабатываю уникальные сайты на Tilda с 2021 года.',
      skills: ['Zero Block', 'Step-by-Step Animation', 'Custom JS'],
      portfolio: [],
      contacts: { telegram: '@smirnov_tilda', email: 'smirnov@fyxi.ru' },
      isApproved: true,
      isVerified: true,
      createdAt: new Date(),
      user: { lastActive: new Date() },
    },
    {
      id: 'd3b07384-d113-460a-a000-000000000002',
      userId: 'user-2',
      firstName: 'Елена',
      lastName: 'Попова',
      title: 'UI/UX Designer Tilda',
      specialization: 'DESIGNER',
      hourlyRate: 1200,
      monthlyRate: 140000,
      experienceYears: 3,
      avatarSymbol: '🎨',
      bio: 'Проектирую удобные интерфейсы для бизнеса.',
      skills: ['Figma', 'Zero Block', 'UX Research'],
      portfolio: [],
      contacts: { telegram: '@popova_design', email: 'popova@fyxi.ru' },
      isApproved: true,
      isVerified: false,
      createdAt: new Date(),
      user: { lastActive: new Date() },
    },
  ];

  const mockPrisma = {
    devProfile: {
      findMany: async (args: any) => {
        let result = [...mockProfiles];
        if (args?.where?.isApproved !== undefined) {
          result = result.filter(p => p.isApproved === args.where.isApproved);
        }
        if (args?.where?.specialization) {
          result = result.filter(p => p.specialization === args.where.specialization);
        }
        if (args?.where?.isVerified) {
          result = result.filter(p => p.isVerified === args.where.isVerified);
        }
        return result;
      },
      findUnique: async (args: any) => {
        return mockProfiles.find(p => p.id === args.where.id) || null;
      },
      update: async (args: any) => {
        const profile = mockProfiles.find(p => p.id === args.where.id);
        if (profile) {
          Object.assign(profile, args.data);
        }
        return profile;
      },
    },
    unlockedProfile: {
      findMany: async () => [],
    },
  };

  beforeAll(async () => {
    app = Fastify();
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(profileRoutes, { prefix: '/profiles' });
    await app.register(adminRoutes, { prefix: '/admin' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should list only approved specialists for public guests on GET /profiles', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles',
    });

    expect(response.statusCode).toBe(200);
    const profiles = JSON.parse(response.body);
    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles.length).toBe(2);
    expect(profiles[0].contacts).toBeUndefined();
  });

  it('should filter specialists by specialization DEVELOPER', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles?specialization=DEVELOPER',
    });

    expect(response.statusCode).toBe(200);
    const profiles = JSON.parse(response.body);
    expect(profiles.length).toBe(1);
    expect(profiles[0].specialization).toBe('DEVELOPER');
  });

  it('should allow ADMIN to toggle verified badge for specialist profile', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-1', email: 'admin@fyxi.ru', role: 'ADMIN' });
    const targetId = 'd3b07384-d113-460a-a000-000000000002';

    const response = await app.inject({
      method: 'POST',
      url: `/admin/profiles/${targetId}/verify`,
      headers: { Cookie: `token=${adminToken}` },
      payload: { isVerified: true },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(mockProfiles[1].isVerified).toBe(true);
  });
});
