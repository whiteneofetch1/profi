import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

import authPlugin from '../src/plugins/auth';
import checkoutRoutes from '../src/routes/checkout';

describe('E2E Transaction Consistency & Payment Idempotency Suite', () => {
  let app: FastifyInstance;
  let purchasesTable: any[] = [];

  const mockPrisma = {
    purchase: {
      findUnique: async (args: any) => {
        return purchasesTable.find(p => p.paymentId === args.where?.paymentId || p.id === args.where?.id) || null;
      },
      update: async (args: any) => {
        const item = purchasesTable.find(p => p.paymentId === args.where?.paymentId || p.id === args.where?.id);
        if (item) {
          item.status = args.data.status;
        }
        return {
          ...item,
          unlockedProfiles: [],
          client: { email: 'client@fyxi.ru' },
        };
      },
    },
    $transaction: async (cb: any) => cb(mockPrisma),
  };

  beforeEach(async () => {
    purchasesTable = [
      {
        id: 'ord_test_999',
        paymentId: 'pay_999',
        clientId: 'client-1',
        amountPaid: 500,
        status: 'PENDING',
      },
    ];

    app = Fastify({ logger: false });
    await app.register(cors);
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(checkoutRoutes, { prefix: '/checkout' });
  });

  it('should process payment completion idempotently on receiving webhook', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      payload: {
        paymentId: 'pay_999',
        status: 'succeeded',
      },
    });

    expect(res1.statusCode).toBe(200);
    expect(purchasesTable[0].status).toBe('COMPLETED');

    // Duplicate webhook call should be idempotent (already COMPLETED)
    const res2 = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      payload: {
        paymentId: 'pay_999',
        status: 'succeeded',
      },
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.body);
    expect(body2.message).toContain('already processed');
  });
});
