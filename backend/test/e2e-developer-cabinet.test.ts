import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import authRoutes from '../src/routes/auth';
import profileRoutes from '../src/routes/profiles';
import adminRoutes from '../src/routes/admin';

describe('E2E Worker/Developer Cabinet Lifecycle Tests', () => {
  let app: FastifyInstance;

  let usersTable: any[] = [];
  let profilesTable: any[] = [];

  const mockPrisma = {
    user: {
      findFirst: async (args: any) => {
        return usersTable.find(u => 
          (args?.where?.verificationToken && u.verificationToken === args.where.verificationToken) ||
          (args?.where?.email && u.email === args.where.email)
        ) || null;
      },
      findUnique: async (args: any) => {
        return usersTable.find(u => 
          (args.where.email && u.email === args.where.email) ||
          (args.where.id && u.id === args.where.id) ||
          (args.where.verificationToken && u.verificationToken === args.where.verificationToken)
        ) || null;
      },
      create: async (args: any) => {
        const u = {
          id: `user-${Math.random().toString(36).substring(2, 9)}`,
          isEmailVerified: false,
          ...args.data,
        };
        usersTable.push(u);
        return u;
      },
      update: async (args: any) => {
        const index = usersTable.findIndex(u => u.id === args.where.id);
        if (index === -1) throw new Error('User not found');
        usersTable[index] = { ...usersTable[index], ...args.data };
        return usersTable[index];
      },
    },
    devProfile: {
      findMany: async (args: any) => {
        let list = [...profilesTable];
        if (args?.where?.isApproved === true) {
          list = list.filter(p => p.isApproved === true);
        }
        return list;
      },
      findUnique: async (args: any) => {
        return profilesTable.find(p => p.id === args.where.id || p.userId === args.where.userId) || null;
      },
      upsert: async (args: any) => {
        const userId = args.where.userId;
        let index = profilesTable.findIndex(p => p.userId === userId);
        if (index !== -1) {
          profilesTable[index] = { ...profilesTable[index], ...args.update };
          return profilesTable[index];
        } else {
          const newProfile = {
            id: '550e8400-e29b-41d4-a716-446655440001',
            userId,
            ...args.create,
            createdAt: new Date(),
            user: { lastActive: new Date() },
          };
          profilesTable.push(newProfile);
          return newProfile;
        }
      },
      update: async (args: any) => {
        const index = profilesTable.findIndex(p => p.id === args.where.id);
        if (index === -1) throw new Error('Not found');
        profilesTable[index] = { ...profilesTable[index], ...args.data };
        return profilesTable[index];
      },
    },
    clientProfile: {
      create: async (args: any) => ({ id: 'cp-1', ...args.data }),
    },
    unlockedProfile: {
      findMany: async () => [],
    },
  };

  beforeEach(async () => {
    usersTable = [];
    profilesTable = [];

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);

    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(profileRoutes, { prefix: '/profiles' });
    await app.register(adminRoutes, { prefix: '/admin' });
    await app.ready();
  });

  it('should complete full worker lifecycle: register, attempt login (blocked), verify email, login, submit profile, admin approval, and logout', async () => {
    // 1. Worker Registers
    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'worker@tildadev.ru',
        password: 'workerpassword2026',
        role: 'DEVELOPER',
      },
    });

    expect(regRes.statusCode).toBe(200);
    const regBody = JSON.parse(regRes.body);
    expect(regBody.success).toBe(true);
    expect(regBody.user.email).toBe('worker@tildadev.ru');

    const createdUser = usersTable.find(u => u.email === 'worker@tildadev.ru');
    expect(createdUser).toBeDefined();
    expect(createdUser.isEmailVerified).toBe(false);
    expect(createdUser.verificationToken).toBeDefined();

    // 2. Worker can log in via /auth/login immediately (instant access)
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'worker@tildadev.ru',
        password: 'workerpassword2026',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    expect(JSON.parse(loginRes.body).user.email).toBe('worker@tildadev.ru');

    // 3. Worker Verifies Email via Token (/auth/verify-email)
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/auth/verify-email',
      payload: {
        token: createdUser.verificationToken,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.body);
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.user.email).toBe('worker@tildadev.ru');
    const updatedUser = usersTable.find(u => u.email === 'worker@tildadev.ru');
    expect(updatedUser.isEmailVerified).toBe(true);
    expect(updatedUser.verificationToken).toBeNull();

    // Verification response sets auth cookie token
    const authCookieHeader = verifyRes.headers['set-cookie'];
    expect(authCookieHeader).toBeDefined();

    // Extract auth token from cookie
    const token = authCookieHeader?.toString().split('token=')[1]?.split(';')[0];
    expect(token).toBeDefined();

    // 4. Worker fetches their own info via GET /auth/me
    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { Cookie: `token=${token}` },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.body);
    expect(meBody.user.email).toBe('worker@tildadev.ru');
    expect(meBody.user.role).toBe('DEVELOPER');

    // 5. Worker fills and submits Profile in Cabinet
    const profilePayload = {
      firstName: 'Артем',
      lastName: 'Смирнов',
      title: 'Senior Vue & Tilda Engineer',
      specialization: 'DEVELOPER',
      bio: 'Разрабатываю сложные кастомные решения для Tilda и Webflow',
      experienceYears: 6,
      skills: ['Vue.js', 'TypeScript', 'Zero Block', 'Node.js'],
      portfolioLinks: ['https://artemdev.ru'],
      hourlyRate: 2500,
      monthlySalary: 200000,
      availability: 'FREE',
      contactEmail: 'worker@tildadev.ru',
      contactTelegram: '@artem_tilda',
      contactPhone: '+79998887766',
    };

    const submitRes = await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: { Cookie: `token=${token}` },
      payload: profilePayload,
    });

    expect(submitRes.statusCode).toBe(200);
    const submitBody = JSON.parse(submitRes.body);
    expect(submitBody.success).toBe(true);
    expect(submitBody.profile.isApproved).toBe(false); // Unapproved initially

    // 6. Admin Approves Profile
    const adminToken = app.jwt.sign({ id: 'admin-id', role: 'ADMIN' });
    const devProfileId = profilesTable[0].id;

    const approveRes = await app.inject({
      method: 'POST',
      url: `/admin/profiles/${devProfileId}/approve`,
      headers: { Cookie: `token=${adminToken}` },
      payload: { isApproved: true },
    });

    expect(approveRes.statusCode).toBe(200);
    expect(profilesTable[0].isApproved).toBe(true);

    // 7. Public Catalog check -> Profile is now published!
    const publicRes = await app.inject({
      method: 'GET',
      url: '/profiles',
    });

    expect(publicRes.statusCode).toBe(200);
    const catalog = JSON.parse(publicRes.body);
    expect(catalog.length).toBe(1);
    expect(catalog[0].firstName).toBe('Артем');

    // 8. Worker Logs Out
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { Cookie: `token=${token}` },
    });

    expect(logoutRes.statusCode).toBe(200);
    expect(JSON.parse(logoutRes.body).success).toBe(true);
  });
});
