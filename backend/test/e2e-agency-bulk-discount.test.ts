import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../src/plugins/auth';
import checkoutRoutes from '../src/routes/checkout';

describe('E2E Bulk Agency Discount & Contact Purchase Flow', () => {
  let app: FastifyInstance;

  const mockPurchases: any[] = [];

  const mockPrisma = {
    user: {
      findUnique: async () => null,
      create: async (args: any) => ({ id: 'guest-agency-id', email: args.data.email, role: 'CLIENT' }),
    },
    clientProfile: {
      create: async () => ({ id: 'cp-1', userId: 'guest-agency-id' }),
    },
    devProfile: {
      findMany: async (args: any) => {
        return args.where.id.in.map((id: string, index: number) => ({
          id,
          firstName: `Specialist_${index + 1}`,
          lastName: 'ZeroBlock',
          title: 'Tilda Developer',
        }));
      },
    },
    platformConfig: {
      findFirst: async () => ({
        id: 1,
        flatRatePrice: 500,
        bundleCount: 5,
        bundlePrice: 2000, // 5 contacts for 2000 RUB (saving 500 RUB)
      }),
    },
    unlockedProfile: {
      findMany: async () => [],
    },
    purchase: {
      create: async (args: any) => {
        const purchase = {
          id: 'agency-purchase-100',
          clientId: args.data.clientId,
          amountPaid: args.data.amountPaid,
          status: 'PENDING',
          paymentId: args.data.paymentId,
          isGuestPurchase: args.data.isGuestPurchase,
        };
        mockPurchases.push(purchase);
        return purchase;
      },
      findUnique: async (args: any) => {
        return mockPurchases.find(p => p.paymentId === args.where.paymentId) || null;
      },
      update: async (args: any) => {
        const purchase = mockPurchases.find(p => p.id === args.where.id);
        if (purchase) {
          purchase.status = args.data.status;
        }
        return {
          ...purchase,
          client: { email: 'agency@fyxi.ru' },
          unlockedProfiles: [
            { devProfile: { firstName: 'Алексей', lastName: 'Петров', title: 'Senior Tilda Dev' } },
            { devProfile: { firstName: 'Мария', lastName: 'Иванова', title: 'UI/UX Art Director' } },
          ],
        };
      },
    },
  };

  beforeAll(async () => {
    app = Fastify();
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(checkoutRoutes, { prefix: '/checkout' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process 6 bulk contacts purchase with 1 bundle discount + 1 flat item (2500 RUB total instead of 3000 RUB)', async () => {
    const devProfileIds = [
      'd3b07384-d113-460a-a000-000000000001',
      'd3b07384-d113-460a-a000-000000000002',
      'd3b07384-d113-460a-a000-000000000003',
      'd3b07384-d113-460a-a000-000000000004',
      'd3b07384-d113-460a-a000-000000000005',
      'd3b07384-d113-460a-a000-000000000006',
    ];

    // 1. Agency submits checkout for 6 specialists
    const createResponse = await app.inject({
      method: 'POST',
      url: '/checkout/create',
      payload: {
        devProfileIds,
        email: 'agency@fyxi.ru',
      },
    });

    expect(createResponse.statusCode).toBe(200);
    const createBody = JSON.parse(createResponse.body);
    expect(createBody.success).toBe(true);
    // Bundle (2000) + 1 extra (500) = 2500 RUB!
    expect(createBody.amount).toBe(2500);

    // 2. YooKassa Webhook receives callback 'succeeded'
    const webhookResponse = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      payload: {
        paymentId: createBody.paymentId,
        status: 'succeeded',
      },
    });

    expect(webhookResponse.statusCode).toBe(200);
    const webhookBody = JSON.parse(webhookResponse.body);
    expect(webhookBody.success).toBe(true);

    // Check that status was updated to COMPLETED in database
    const savedPurchase = mockPurchases.find(p => p.paymentId === createBody.paymentId);
    expect(savedPurchase.status).toBe('COMPLETED');
  });
});
