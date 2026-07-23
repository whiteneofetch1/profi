import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import checkoutRoutes from '../src/routes/checkout';

describe('E2E Payment Webhooks & Contact Unlocking Lifecycle', () => {
  let app: FastifyInstance;

  let purchasesTable: any[] = [];
  let unlockedTable: any[] = [];

  const mockPrisma = {
    purchase: {
      findUnique: async (args: any) => {
        return purchasesTable.find(p => p.paymentId === args.where.paymentId) || null;
      },
      update: async (args: any) => {
        const index = purchasesTable.findIndex(p => p.id === args.where.id);
        if (index === -1) throw new Error('Purchase not found');
        purchasesTable[index] = { ...purchasesTable[index], ...args.data };
        return {
          ...purchasesTable[index],
          client: { email: 'client@company.ru' },
          unlockedProfiles: unlockedTable.map(u => ({ id: u.id, devProfile: { firstName: 'Алексей', title: 'Dev' } })),
        };
      },
    },
    unlockedProfile: {
      createMany: async (args: any) => {
        args.data.forEach((item: any) => {
          unlockedTable.push({ id: `unlocked-${Math.random()}`, ...item });
        });
        return { count: args.data.length };
      },
    },
  };

  beforeEach(async () => {
    purchasesTable = [
      {
        id: 'purch-1',
        paymentId: 'pay_yookassa_12345',
        clientId: 'client-1',
        amountPaid: 5980,
        status: 'PENDING',
        createdAt: new Date(),
      },
      {
        id: 'purch-completed',
        paymentId: 'pay_already_processed',
        clientId: 'client-1',
        amountPaid: 2990,
        status: 'COMPLETED',
        createdAt: new Date(),
      },
    ];
    unlockedTable = [];

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(checkoutRoutes, { prefix: '/checkout' });
  });

  it('should process webhook callback and fulfill payment when status is succeeded', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      payload: {
        paymentId: 'pay_yookassa_12345',
        status: 'succeeded',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(purchasesTable[0].status).toBe('COMPLETED');
  });

  it('should ignore webhook if transaction is already processed (Idempotency)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      payload: {
        paymentId: 'pay_already_processed',
        status: 'succeeded',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('already processed');
  });

  it('should set status to FAILED when webhook signals payment failure', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      payload: {
        paymentId: 'pay_yookassa_12345',
        status: 'failed',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(purchasesTable[0].status).toBe('FAILED');
  });

  it('should return 404 if paymentId does not exist in DB', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      payload: {
        paymentId: 'unknown_payment_id',
        status: 'succeeded',
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
