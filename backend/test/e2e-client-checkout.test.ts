import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import authRoutes from '../src/routes/auth';
import profileRoutes from '../src/routes/profiles';
import checkoutRoutes from '../src/routes/checkout';

describe('E2E Client Checkout & Contact Unlocking Flow', () => {
  let app: FastifyInstance;

  // Simulated Database tables in memory to mimic actual relational joins & updates
  let usersTable: any[] = [];
  let profilesTable: any[] = [];
  let purchasesTable: any[] = [];
  let unlockedProfilesTable: any[] = [];
  let configTable = {
    flatRatePrice: 500,
    bundleCount: 5,
    bundlePrice: 2000,
  };

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
      findMany: vi.fn().mockImplementation(async () => {
        return profilesTable;
      }),
      findUnique: vi.fn().mockImplementation(async (args) => {
        return profilesTable.find(p => p.id === args.where.id) || null;
      }),
    },
    unlockedProfile: {
      findMany: vi.fn().mockImplementation(async (args) => {
        const clientId = args?.where?.purchase?.clientId;
        if (clientId) {
          return unlockedProfilesTable.filter(u => u.clientId === clientId);
        }
        return unlockedProfilesTable;
      }),
      create: vi.fn().mockImplementation(async (args) => {
        const up = { id: `up-${Math.random().toString(36).substr(2, 9)}`, ...args.data };
        unlockedProfilesTable.push(up);
        return up;
      }),
    },
    clientProfile: {
      create: vi.fn().mockImplementation(async (args) => {
        return { id: `cp-${Math.random().toString(36).substr(2, 9)}`, ...args.data };
      }),
    },
    platformConfig: {
      findFirst: vi.fn().mockImplementation(async () => {
        return configTable;
      }),
      create: vi.fn().mockImplementation(async (args) => {
        return { id: 'config-1', ...args.data };
      }),
    },
    purchase: {
      create: vi.fn().mockImplementation(async (args) => {
        const paymentId = args.data.paymentId;
        const p = {
          id: `tx-${Math.random().toString(36).substr(2, 9)}`,
          clientId: args.data.clientId,
          amountPaid: args.data.amountPaid,
          status: 'PENDING',
          paymentId: paymentId,
          devProfileIds: args.data.unlockedProfiles?.create?.map((x: any) => x.devProfileId) || [],
        };
        purchasesTable.push(p);
        return p;
      }),
      findUnique: vi.fn().mockImplementation(async (args) => {
        return purchasesTable.find(p => p.id === args.where.id || p.paymentId === args.where.paymentId) || null;
      }),
      update: vi.fn().mockImplementation(async (args) => {
        const index = purchasesTable.findIndex(p => p.id === args.where.id || p.paymentId === args.where.paymentId);
        if (index === -1) throw new Error('Not found');
        purchasesTable[index] = { ...purchasesTable[index], ...args.data };
        
        // E2E side effect: if payment completes successfully, add developer profiles to unlocked table!
        if (args.data.status === 'COMPLETED') {
          const tx = purchasesTable[index];
          const ids = tx.devProfileIds || ['11111111-1111-1111-1111-111111111111'];
          for (const devId of ids) {
            unlockedProfilesTable.push({
              clientId: tx.clientId || 'guest-user',
              devProfileId: devId,
            });
          }
        }
        return purchasesTable[index];
      }),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    usersTable = [];
    profilesTable = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        firstName: 'Елена',
        lastName: 'Петрова',
        title: 'Senior UX Designer',
        specialization: 'DESIGNER',
        bio: 'Figma and Tilda expert',
        experienceYears: 5,
        skills: ['Figma', 'Tilda'],
        hourlyRate: 1800,
        monthlySalary: 140000,
        availability: 'FREE',
        isVerified: true,
        isApproved: true,
        contactEmail: 'elena@design.ru',
        contactTelegram: '@elena_designer',
        contactPhone: '+79997776655',
        user: { lastActive: new Date() },
      }
    ];
    purchasesTable = [];
    unlockedProfilesTable = [];

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma);
    await app.register(authPlugin);

    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(profileRoutes, { prefix: '/profiles' });
    await app.register(checkoutRoutes, { prefix: '/checkout' });
  });

  it('should run full E2E flow: registration, viewing masked profiles, checking out, and unlocking contact details', async () => {
    // 1. CLIENT REGISTERS & LOGS IN
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'agency@hr-pro.ru',
        password: 'password2026',
        role: 'CLIENT',
      },
    });

    expect(registerResponse.statusCode).toBe(200);
    const registerBody = JSON.parse(registerResponse.body);
    expect(registerBody.success).toBe(true);
    const userId = usersTable.find(u => u.email === 'agency@hr-pro.ru').id;
    const clientToken = app.jwt.sign({ id: userId, email: 'agency@hr-pro.ru', role: 'CLIENT' });

    // 2. CLIENT REQUESTS PROFILES -> CONTACT DETAILS MUST BE OBFUSCATED (NULL)
    const profilesResponse1 = await app.inject({
      method: 'GET',
      url: '/profiles',
      headers: { Cookie: `token=${clientToken}` },
    });

    expect(profilesResponse1.statusCode).toBe(200);
    const list1 = JSON.parse(profilesResponse1.body);
    expect(list1.length).toBe(1);
    expect(list1[0].isUnlocked).toBe(false);
    expect(list1[0].contactEmail).toBeNull();
    expect(list1[0].contactTelegram).toBeNull();
    expect(list1[0].contactPhone).toBeNull();

    // 3. CLIENT CREATES A CHECKOUT ORDER FOR ELENA'S PROFILE
    const checkoutResponse = await app.inject({
      method: 'POST',
      url: '/checkout/create',
      headers: { Cookie: `token=${clientToken}` },
      payload: {
        devProfileIds: ['11111111-1111-1111-1111-111111111111'],
        email: 'agency@hr-pro.ru',
      },
    });

    expect(checkoutResponse.statusCode).toBe(200);
    const checkoutBody = JSON.parse(checkoutResponse.body);
    expect(checkoutBody.success).toBe(true);
    expect(checkoutBody.amount).toBe(500); // Standard flat rate
    const paymentUrl = checkoutBody.paymentUrl;
    expect(paymentUrl).toContain('/checkout/mock-gateway?paymentId=');

    // Extract transaction ID from the simulated gateway URL
    const paymentId = paymentUrl.split('paymentId=')[1];
    expect(paymentId).toBeDefined();

    // Verify transaction is PENDING in database
    const pendingTx = purchasesTable.find(tx => tx.paymentId === paymentId);
    expect(pendingTx).toBeDefined();
    expect(pendingTx.status).toBe('PENDING');

    // 4. CLIENT COMPLETES THE TRANSACTION (Gateway Webhook trigger)
    const callbackResponse = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      payload: {
        paymentId: paymentId,
        status: 'succeeded',
      },
    });

    expect(callbackResponse.statusCode).toBe(200);
    const callbackBody = JSON.parse(callbackResponse.body);
    expect(callbackBody.success).toBe(true);

    // Verify transaction is COMPLETED in database, triggering unlock relation side-effect
    const completedTx = purchasesTable.find(tx => tx.paymentId === paymentId);
    expect(completedTx.status).toBe('COMPLETED');
    expect(unlockedProfilesTable.length).toBe(1);

    // 5. CLIENT REQUESTS PROFILES AGAIN -> CONTACT DETAILS MUST BE REVEALED
    const profilesResponse2 = await app.inject({
      method: 'GET',
      url: '/profiles',
      headers: { Cookie: `token=${clientToken}` },
    });

    expect(profilesResponse2.statusCode).toBe(200);
    const list2 = JSON.parse(profilesResponse2.body);
    expect(list2.length).toBe(1);
    expect(list2[0].isUnlocked).toBe(true);
    expect(list2[0].contactEmail).toBe('elena@design.ru');
    expect(list2[0].contactTelegram).toBe('@elena_designer');
    expect(list2[0].contactPhone).toBe('+79997776655');
  });
});
