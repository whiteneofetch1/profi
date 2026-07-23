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
      slug: 'elena-popova-custom',
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
    {
      id: '9719fec7-0000-4000-a000-000000000099',
      userId: 'user-3',
      slug: null, // Null slug in DB to test short ID fallback!
      firstName: 'Илья',
      lastName: 'Макаров',
      title: 'Fullstack Tilda Engineer',
      specialization: 'DEVELOPER',
      hourlyRate: 2000,
      monthlyRate: 160000,
      experienceYears: 4,
      avatarSymbol: '💻',
      bio: 'Дорабатываю сайты на Tilda с помощью кода.',
      skills: ['Tilda', 'Zero Block', 'JavaScript'],
      portfolio: [],
      contacts: { telegram: '@ilya_code', email: 'ilya@fyxi.ru' },
      isApproved: true,
      isVerified: true,
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
      findFirst: async (args: any) => {
        if (args?.where?.OR) {
          for (const condition of args.where.OR) {
            if (condition.id) {
              const match = mockProfiles.find(p => p.id === condition.id);
              if (match) return match;
            }
            if (condition.slug) {
              const match = mockProfiles.find(p => p.slug === condition.slug);
              if (match) return match;
            }
            if (condition.id?.startsWith) {
              const prefix = condition.id.startsWith;
              const match = mockProfiles.find(p => p.id.startsWith(prefix));
              if (match) return match;
            }
          }
        }
        if (args?.where?.id) {
          return mockProfiles.find(p => p.id === args.where.id) || null;
        }
        if (args?.where?.slug) {
          return mockProfiles.find(p => p.slug === args.where.slug) || null;
        }
        return null;
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
    expect(profiles.length).toBe(3);
    expect(profiles[0].contacts).toBeUndefined();
  });

  it('should fetch profile by full UUID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles/d3b07384-d113-460a-a000-000000000001',
    });

    expect(response.statusCode).toBe(200);
    const profile = JSON.parse(response.body);
    expect(profile.id).toBe('d3b07384-d113-460a-a000-000000000001');
    expect(profile.firstName).toBe('Алексей');
  });

  it('should fetch profile by exact stored slug', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles/elena-popova-custom',
    });

    expect(response.statusCode).toBe(200);
    const profile = JSON.parse(response.body);
    expect(profile.id).toBe('d3b07384-d113-460a-a000-000000000002');
    expect(profile.firstName).toBe('Елена');
  });

  it('should fetch profile by short ID fallback when slug in DB is null (e.g. ilya-29-makarov-9719fec7)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles/ilya-29-makarov-9719fec7',
    });

    expect(response.statusCode).toBe(200);
    const profile = JSON.parse(response.body);
    expect(profile.id).toBe('9719fec7-0000-4000-a000-000000000099');
    expect(profile.firstName).toBe('Илья');
    expect(profile.lastName).toBe('Макаров');
  });

  it('should return 404 for non-existent profile slug or UUID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles/non-existent-user-12345678',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Specialist profile not found');
  });

  it('should filter specialists by specialization DEVELOPER', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profiles?specialization=DEVELOPER',
    });

    expect(response.statusCode).toBe(200);
    const profiles = JSON.parse(response.body);
    expect(profiles.length).toBe(2);
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
