import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import authPlugin from '../src/plugins/auth';
import blogRoutes from '../src/routes/blog';
import adminRoutes from '../src/routes/admin';

describe('E2E Lifecycle of Automated Scheduled Articles', () => {
  let app: FastifyInstance;

  // Real-like mock store for BlogPost to simulate actual database state transitions
  let blogDb: any[] = [];

  const mockPrisma = {
    blogPost: {
      findMany: vi.fn().mockImplementation(async (args?: any) => {
        // Handle sorting/filtering by publishDate
        let list = [...blogDb];
        if (args?.where?.publishDate?.lte) {
          const lteDate = new Date(args.where.publishDate.lte);
          list = list.filter(p => new Date(p.publishDate) <= lteDate);
        }
        return list.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
      }),
      findUnique: vi.fn().mockImplementation(async (args: any) => {
        return blogDb.find(p => p.slug === args.where.slug || p.id === args.where.id) || null;
      }),
      create: vi.fn().mockImplementation(async (args: any) => {
        const newPost = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          ...args.data,
        };
        blogDb.push(newPost);
        return newPost;
      }),
      update: vi.fn().mockImplementation(async (args: any) => {
        const index = blogDb.findIndex(p => p.id === args.where.id);
        if (index === -1) throw new Error('Not found');
        blogDb[index] = { ...blogDb[index], ...args.data };
        return blogDb[index];
      }),
      delete: vi.fn().mockImplementation(async (args: any) => {
        const index = blogDb.findIndex(p => p.id === args.where.id);
        if (index === -1) throw new Error('Not found');
        const deleted = blogDb[index];
        blogDb.splice(index, 1);
        return deleted;
      }),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    blogDb = []; // Reset DB state

    app = Fastify({ logger: false });
    await app.register(helmet);
    await app.register(cors);

    // Inject our mock prisma
    app.decorate('prisma', mockPrisma);

    // Register auth utilities
    await app.register(authPlugin);

    // Register routes
    await app.register(blogRoutes, { prefix: '/blog' });
    await app.register(adminRoutes, { prefix: '/admin' });
  });

  it('should successfully run the full E2E lifecycle of a scheduled article', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-1', email: 'admin@fyxi.ru', role: 'ADMIN' });
    
    // 1. ADMIN CREATES A FUTURE SCHEDULED ARTICLE
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(); // 5 days in the future
    const scheduledArticlePayload = {
      title: 'Секреты автоматизации SEO',
      slug: 'sekrety-avtomatizatsii-seo',
      category: 'Технологии',
      readTime: '8 мин',
      author: 'Михаил',
      authorRole: 'Head of SEO',
      description: 'Как мы автоматизировали публикацию 100 статей на Tilda и Vue',
      content: '<h2>Автоматизация рулит!</h2><p>Подробный гайд по автопостингу.</p>',
      keywords: ['SEO', 'Автоматизация', 'Nuxt'],
      publishDate: futureDate,
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/admin/blog',
      headers: { Cookie: `token=${adminToken}` },
      payload: scheduledArticlePayload,
    });

    expect(createResponse.statusCode).toBe(200);
    const createBody = JSON.parse(createResponse.body);
    expect(createBody.success).toBe(true);
    expect(createBody.post.id).toBeDefined();
    const createdId = createBody.post.id;

    // Verify it is inside our simulated database
    expect(blogDb.length).toBe(1);
    expect(blogDb[0].id).toBe(createdId);

    // 2. GUEST REQUESTS BLOG LIST (GET /blog) -> MUST NOT CONTAIN FUTURE ARTICLE
    const guestListResponse = await app.inject({
      method: 'GET',
      url: '/blog',
    });
    expect(guestListResponse.statusCode).toBe(200);
    const guestList = JSON.parse(guestListResponse.body);
    expect(guestList.length).toBe(0); // Excluded because it's scheduled in the future!

    // 3. GUEST REQUESTS DETAIL BY SLUG (GET /blog/:slug) -> MUST RETURN 404 ERROR
    const guestDetailResponse = await app.inject({
      method: 'GET',
      url: '/blog/sekrety-avtomatizatsii-seo',
    });
    expect(guestDetailResponse.statusCode).toBe(404);
    const guestDetailBody = JSON.parse(guestDetailResponse.body);
    expect(guestDetailBody.error).toContain('не найдена или еще не опубликована');

    // 3b. ADMIN REQUESTS DETAIL BY SLUG (GET /blog/:slug) -> MUST RETURN 200 OK FOR ADMIN PREVIEW
    const adminDetailResponseCookie = await app.inject({
      method: 'GET',
      url: '/blog/sekrety-avtomatizatsii-seo',
      headers: { Cookie: `token=${adminToken}` },
    });
    expect(adminDetailResponseCookie.statusCode).toBe(200);
    const adminDetailBodyCookie = JSON.parse(adminDetailResponseCookie.body);
    expect(adminDetailBodyCookie.title).toBe('Секреты автоматизации SEO');

    const adminDetailResponseBearer = await app.inject({
      method: 'GET',
      url: '/blog/sekrety-avtomatizatsii-seo',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(adminDetailResponseBearer.statusCode).toBe(200);
    const adminDetailBodyBearer = JSON.parse(adminDetailResponseBearer.body);
    expect(adminDetailBodyBearer.title).toBe('Секреты автоматизации SEO');

    // 4. ADMIN REQUESTS CMS LIST (GET /admin/blog) -> MUST CONTAIN FUTURE ARTICLE
    const adminListResponse = await app.inject({
      method: 'GET',
      url: '/admin/blog',
      headers: { Cookie: `token=${adminToken}` },
    });
    expect(adminListResponse.statusCode).toBe(200);
    const adminList = JSON.parse(adminListResponse.body);
    expect(adminList.length).toBe(1);
    expect(adminList[0].id).toBe(createdId);
    expect(adminList[0].slug).toBe('sekrety-avtomatizatsii-seo');

    // 5. ADMIN UPDATES PUBLISH DATE TO THE PAST (PUBLISH IT NOW)
    const pastDate = new Date(Date.now() - 1000 * 60).toISOString(); // 1 minute in the past
    const updateResponse = await app.inject({
      method: 'PUT',
      url: `/admin/blog/${createdId}`,
      headers: { Cookie: `token=${adminToken}` },
      payload: {
        ...scheduledArticlePayload,
        publishDate: pastDate,
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    const updateBody = JSON.parse(updateResponse.body);
    expect(updateBody.success).toBe(true);
    expect(new Date(blogDb[0].publishDate).toISOString()).toBe(pastDate);

    // 6. GUEST REQUESTS BLOG LIST AGAIN -> MUST CONTAIN THE ARTICLE NOW
    const guestListResponse2 = await app.inject({
      method: 'GET',
      url: '/blog',
    });
    expect(guestListResponse2.statusCode).toBe(200);
    const guestList2 = JSON.parse(guestListResponse2.body);
    expect(guestList2.length).toBe(1);
    expect(guestList2[0].slug).toBe('sekrety-avtomatizatsii-seo');

    // 7. GUEST REQUESTS DETAIL BY SLUG AGAIN -> MUST WORK SUCCESSFULLY (200 OK) WITH FULL SEO
    const guestDetailResponse2 = await app.inject({
      method: 'GET',
      url: '/blog/sekrety-avtomatizatsii-seo',
    });
    expect(guestDetailResponse2.statusCode).toBe(200);
    const guestDetail2 = JSON.parse(guestDetailResponse2.body);
    expect(guestDetail2.slug).toBe('sekrety-avtomatizatsii-seo');
    expect(guestDetail2.title).toBe('Секреты автоматизации SEO');
    expect(guestDetail2.description).toBe('Как мы автоматизировали публикацию 100 статей на Tilda и Vue');

    // 8. ADMIN DELETES THE ARTICLE -> DATABASE MUST BE EMPTY
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/admin/blog/${createdId}`,
      headers: { Cookie: `token=${adminToken}` },
    });
    expect(deleteResponse.statusCode).toBe(200);
    expect(JSON.parse(deleteResponse.body).success).toBe(true);
    expect(blogDb.length).toBe(0);
  });
});
