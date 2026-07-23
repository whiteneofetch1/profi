import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import authRoutes from '../src/routes/auth';
import profileRoutes from '../src/routes/profiles';
import adminRoutes from '../src/routes/admin';

describe('E2E Developer Profile Approval & Verification Lifecycle', () => {
  let app: FastifyInstance;

  // Simulated Database tables in memory to mimic actual relational joins & updates
  let usersTable: any[] = [];
  let profilesTable: any[] = [];

  const mockPrisma = {
    user: {
      findUnique: vi.fn().mockImplementation(async (args) => {
        return usersTable.find(u => u.email === args.where.email || u.id === args.where.id) || null;
      }),
      create: vi.fn().mockImplementation(async (args) => {
        const u = { id: `user-${Math.random().toString(36).substr(2, 9)}`, ...args.data };
        usersTable.push(u);
        return u;
      }),
    },
    devProfile: {
      findMany: vi.fn().mockImplementation(async (args) => {
        let list = [...profilesTable];
        // Public endpoint filters by isApproved: true
        if (args?.where?.isApproved === true) {
          list = list.filter(p => p.isApproved === true);
        }
        return list;
      }),
      findUnique: vi.fn().mockImplementation(async (args) => {
        return profilesTable.find(p => p.id === args.where.id) || null;
      }),
      upsert: vi.fn().mockImplementation(async (args) => {
        const userId = args.where.userId;
        let index = profilesTable.findIndex(p => p.userId === userId);
        
        if (index !== -1) {
          profilesTable[index] = {
            ...profilesTable[index],
            ...args.update,
          };
          return profilesTable[index];
        } else {
          const newProfile = {
            id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
            userId,
            ...args.create,
            createdAt: new Date(),
            user: { lastActive: new Date() }, // Simulated relation
          };
          profilesTable.push(newProfile);
          return newProfile;
        }
      }),
      update: vi.fn().mockImplementation(async (args) => {
        const index = profilesTable.findIndex(p => p.id === args.where.id);
        if (index === -1) throw new Error('Not found');
        profilesTable[index] = {
          ...profilesTable[index],
          ...args.data,
        };
        return profilesTable[index];
      }),
    },
    unlockedProfile: {
      findMany: vi.fn().mockImplementation(async () => []),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    usersTable = [];
    profilesTable = [];

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma);
    await app.register(authPlugin);

    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(profileRoutes, { prefix: '/profiles' });
    await app.register(adminRoutes, { prefix: '/admin' });
  });

  it('should successfully execute the entire developer registration, profile submission, admin approval and verification flow', async () => {
    // 1. DEVELOPER REGISTERS & LOGS IN
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'ivan@tildadev.ru',
        password: 'securepassword2026',
        role: 'DEVELOPER',
      },
    });

    expect(registerResponse.statusCode).toBe(200);
    const registerBody = JSON.parse(registerResponse.body);
    expect(registerBody.success).toBe(true);
    const devUserId = usersTable.find(u => u.email === 'ivan@tildadev.ru').id;
    const devToken = app.jwt.sign({ id: devUserId, email: 'ivan@tildadev.ru', role: 'DEVELOPER' });

    // 2. DEVELOPER SUBMITS THEIR PORTFOLIO PROFILE
    const devProfilePayload = {
      firstName: 'Иван',
      lastName: 'Казаков',
      title: 'Fullstack Tilda & Vue Developer',
      specialization: 'DEVELOPER',
      bio: 'Professional coder with 5+ years of experience',
      experienceYears: 5,
      skills: ['Vue 3', 'Tilda', 'Sass', 'SEO'],
      portfolioLinks: ['https://portfolio.ru/case1'],
      hourlyRate: 1500,
      monthlySalary: 120000,
      contactEmail: 'ivan@tildadev.ru',
      contactTelegram: '@ivan_dev',
    };

    const submitResponse = await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: { Cookie: `token=${devToken}` },
      payload: devProfilePayload,
    });

    expect(submitResponse.statusCode).toBe(200);
    const submitBody = JSON.parse(submitResponse.body);
    expect(submitBody.success).toBe(true);
    expect(submitBody.profile.isApproved).toBe(false); // Unapproved initially

    // 3. GUEST FETCHES PUBLIC CATALOG -> MUST BE EMPTY (since developer profile is unapproved)
    const publicCatalog1 = await app.inject({
      method: 'GET',
      url: '/profiles',
    });
    expect(publicCatalog1.statusCode).toBe(200);
    const publicList1 = JSON.parse(publicCatalog1.body);
    expect(publicList1.length).toBe(0);

    // 4. ADMIN LOGS IN AND CHECKS MODERATION QUEUE
    const adminToken = app.jwt.sign({ id: 'admin-id', email: 'admin@fyxi.ru', role: 'ADMIN' });
    const adminListResponse = await app.inject({
      method: 'GET',
      url: '/admin/profiles',
      headers: { Cookie: `token=${adminToken}` },
    });
    expect(adminListResponse.statusCode).toBe(200);
    const adminList = JSON.parse(adminListResponse.body);
    expect(adminList.length).toBe(1);
    expect(adminList[0].id).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(adminList[0].firstName).toBe('Иван');
    expect(adminList[0].isApproved).toBe(false);

    // 5. ADMIN APPROVES DEVELOPER'S PROFILE (sending isApproved in payload)
    const approveResponse = await app.inject({
      method: 'POST',
      url: '/admin/profiles/550e8400-e29b-41d4-a716-446655440001/approve',
      headers: { Cookie: `token=${adminToken}` },
      payload: { isApproved: true },
    });
    expect(approveResponse.statusCode).toBe(200);
    expect(JSON.parse(approveResponse.body).success).toBe(true);
    expect(profilesTable[0].isApproved).toBe(true);

    // 6. ADMIN VERIFIES DEVELOPER'S EXPERIENCE (NEON BADGE) (sending isVerified in payload)
    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/admin/profiles/550e8400-e29b-41d4-a716-446655440001/verify',
      headers: { Cookie: `token=${adminToken}` },
      payload: { isVerified: true },
    });
    expect(verifyResponse.statusCode).toBe(200);
    expect(JSON.parse(verifyResponse.body).success).toBe(true);
    expect(profilesTable[0].isVerified).toBe(true);

    // 7. GUEST FETCHES PUBLIC CATALOG AGAIN -> PROFILE MUST BE NOW VISIBLE AND VERIFIED!
    const publicCatalog2 = await app.inject({
      method: 'GET',
      url: '/profiles',
    });
    expect(publicCatalog2.statusCode).toBe(200);
    const publicList2 = JSON.parse(publicCatalog2.body);
    expect(publicList2.length).toBe(1);
    expect(publicList2[0].id).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(publicList2[0].firstName).toBe('Иван');
    expect(publicList2[0].isVerified).toBe(true);
  });
});
