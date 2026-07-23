import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import authRoutes from '../src/routes/auth';

describe('E2E Security Headers & Protection Suite', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    user: {
      findUnique: async () => null,
    },
  };

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(authRoutes, { prefix: '/auth' });
  });

  it('should include strict security headers via Helmet plugin on responses', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
    });

    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should handle invalid login payload without leaking internal server stack traces', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'invalid-email-format',
        password: '',
      },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
    const body = JSON.parse(res.body);
    expect(body.error || body.message).toBeDefined();
    expect(res.body).not.toContain('Node.js');
    expect(res.body).not.toContain('prisma/client');
  });
});
