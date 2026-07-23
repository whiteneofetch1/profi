import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import authPlugin from '../src/plugins/auth';
import uploadRoutes from '../src/routes/upload';
import FormData from 'form-data';
import path from 'path';
import fs from 'fs';

describe('E2E Upload Route & Static Image Serving Suite', () => {
  let app: FastifyInstance;
  const createdFiles: string[] = [];

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(multipart, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    });

    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    await app.register(fastifyStatic, {
      root: uploadDir,
      prefix: '/api/uploads/',
    });

    await app.register(fastifyStatic, {
      root: uploadDir,
      prefix: '/uploads/',
      decorateReply: false,
    });

    app.decorate('prisma', {} as any);
    await app.register(authPlugin);
    await app.register(uploadRoutes, { prefix: '/api/upload' });
    await app.ready();
  });

  afterEach(async () => {
    // Cleanup any files created during tests to keep system clean
    const uploadDir = path.join(__dirname, '..', 'uploads');
    for (const fileName of createdFiles) {
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    createdFiles.length = 0;
    await app.close();
  });

  it('1. should reject unauthenticated upload requests with 401/403 status', async () => {
    const form = new FormData();
    form.append('file', Buffer.from('fake image data'), 'test.png');

    const res = await app.inject({
      method: 'POST',
      url: '/api/upload',
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    });

    expect([401, 403]).toContain(res.statusCode);
  });

  it('2. should reject forbidden file extensions (.exe, .php, .sh, .html, .js)', async () => {
    const token = app.jwt.sign({ id: 'user-1', role: 'DEVELOPER' });
    const form = new FormData();
    form.append('file', Buffer.from('echo bad script'), 'malicious.sh');

    const res = await app.inject({
      method: 'POST',
      url: '/api/upload',
      headers: {
        ...form.getHeaders(),
        authorization: `Bearer ${token}`,
      },
      payload: form.getBuffer(),
    });

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.body);
    expect(json.error).toBe('Неподдерживаемый формат файла');
  });

  it('3. should successfully upload valid image formats (.png, .jpg, .webp) and return /api/uploads/ URL', async () => {
    const token = app.jwt.sign({ id: 'user-1', role: 'DEVELOPER' });
    const imageBuffer = Buffer.from('PNG_FAKE_IMAGE_DATA_HEADER');
    
    const form = new FormData();
    form.append('file', imageBuffer, 'avatar.png');

    const res = await app.inject({
      method: 'POST',
      url: '/api/upload',
      headers: {
        ...form.getHeaders(),
        authorization: `Bearer ${token}`,
      },
      payload: form.getBuffer(),
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.url).toMatch(/^\/api\/uploads\/[a-f0-9-]+\.png$/);
    expect(json.fileName).toMatch(/^[a-f0-9-]+\.png$/);

    createdFiles.push(json.fileName);
  });

  it('4. should verify that uploaded image IS ACCESSIBLE via GET /api/uploads/{fileName} (Fixes 404 image bug!)', async () => {
    const token = app.jwt.sign({ id: 'user-1', role: 'DEVELOPER' });
    const imageContent = Buffer.from('WEBP_IMAGE_BINARY_TEST_CONTENT_12345');
    
    const form = new FormData();
    form.append('file', imageContent, 'portfolio_cover.webp');

    const uploadRes = await app.inject({
      method: 'POST',
      url: '/api/upload',
      headers: {
        ...form.getHeaders(),
        authorization: `Bearer ${token}`,
      },
      payload: form.getBuffer(),
    });

    expect(uploadRes.statusCode).toBe(200);
    const { url, fileName } = JSON.parse(uploadRes.body);
    createdFiles.push(fileName);

    // Fetch static file via returned URL (/api/uploads/filename.webp)
    const staticRes = await app.inject({
      method: 'GET',
      url: url,
    });

    expect(staticRes.statusCode).toBe(200);
    expect(staticRes.rawPayload).toEqual(imageContent);
  });

  it('5. should verify that uploaded image is ALSO accessible via GET /uploads/{fileName}', async () => {
    const token = app.jwt.sign({ id: 'user-1', role: 'DEVELOPER' });
    const imageContent = Buffer.from('JPEG_IMAGE_CONTENT');
    
    const form = new FormData();
    form.append('file', imageContent, 'photo.jpg');

    const uploadRes = await app.inject({
      method: 'POST',
      url: '/api/upload',
      headers: {
        ...form.getHeaders(),
        authorization: `Bearer ${token}`,
      },
      payload: form.getBuffer(),
    });

    expect(uploadRes.statusCode).toBe(200);
    const { fileName } = JSON.parse(uploadRes.body);
    createdFiles.push(fileName);

    const staticRes = await app.inject({
      method: 'GET',
      url: `/uploads/${fileName}`,
    });

    expect(staticRes.statusCode).toBe(200);
    expect(staticRes.rawPayload).toEqual(imageContent);
  });
});
