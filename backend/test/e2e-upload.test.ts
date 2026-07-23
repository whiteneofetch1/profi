import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import authPlugin from '../src/plugins/auth';
import uploadRoutes from '../src/routes/upload';
import FormData from 'form-data';

describe('E2E Upload Route', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(multipart);
    app.decorate('prisma', {} as any);
    await app.register(authPlugin);
    await app.register(uploadRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should reject unauthenticated upload requests', async () => {
    const form = new FormData();
    form.append('file', Buffer.from('fake image data'), 'test.png');

    const res = await app.inject({
      method: 'POST',
      url: '/',
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    });

    // Our auth plugin typically returns 401 for missing token
    expect([401, 403]).toContain(res.statusCode); 
  });
});
