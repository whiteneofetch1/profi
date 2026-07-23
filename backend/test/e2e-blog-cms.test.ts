import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../src/plugins/auth';
import blogRoutes from '../src/routes/blog';
import adminRoutes from '../src/routes/admin';

describe('E2E Blog CMS & Scheduled Articles Visibility Lifecycle', () => {
  let app: FastifyInstance;

  const mockPosts: any[] = [
    {
      id: 'post-1',
      title: 'Как нанять Senior Tilda разработчика',
      slug: 'kak-nanyat-senior-tilda-razrabotchika',
      description: 'Гайд по найму исполнителей Zero Block',
      category: 'Технологии',
      readTime: '6 мин',
      author: 'Алексей Миронов',
      authorRole: 'CEO fyxi.ru',
      keywords: ['Tilda', 'Zero Block', 'Найм'],
      content: '<h2>Инструкция по найму</h2><p>Содержимое статьи...</p>',
      publishDate: new Date(Date.now() - 3600 * 1000), // Published 1 hour ago
      createdAt: new Date(),
    },
    {
      id: 'post-2',
      title: 'Запланированный релиз статьи',
      slug: 'zaplanirovannyj-reliz-statji',
      description: 'Статья появится завтра',
      category: 'Аналитика',
      readTime: '5 мин',
      author: 'Редакция',
      authorRole: 'fyxi.ru',
      keywords: ['Аналитика'],
      content: '<p>Будущий контент...</p>',
      publishDate: new Date(Date.now() + 86400 * 1000), // Scheduled for tomorrow
      createdAt: new Date(),
    },
  ];

  const mockPrisma = {
    blogPost: {
      findMany: async (args: any) => {
        let result = [...mockPosts];
        if (args?.where?.publishDate?.lte) {
          const lteDate = new Date(args.where.publishDate.lte);
          result = result.filter(p => new Date(p.publishDate) <= lteDate);
        }
        return result;
      },
      findUnique: async (args: any) => {
        return mockPosts.find(p => p.slug === args.where.slug) || null;
      },
      create: async (args: any) => {
        const post = {
          id: `post-${Date.now()}`,
          ...args.data,
        };
        mockPosts.push(post);
        return post;
      },
      update: async (args: any) => {
        const post = mockPosts.find(p => p.id === args.where.id);
        if (post) {
          Object.assign(post, args.data);
        }
        return post;
      },
    },
  };

  beforeAll(async () => {
    app = Fastify();
    app.decorate('prisma', mockPrisma as any);
    await app.register(authPlugin);
    await app.register(blogRoutes, { prefix: '/blog' });
    await app.register(adminRoutes, { prefix: '/admin' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return only published articles for public readers on GET /blog', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/blog',
    });

    expect(response.statusCode).toBe(200);
    const posts = JSON.parse(response.body);
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBe(1);
    expect(posts[0].slug).toBe('kak-nanyat-senior-tilda-razrabotchika');
  });

  it('should allow readers to fetch article details by slug on GET /blog/:slug', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/blog/kak-nanyat-senior-tilda-razrabotchika',
    });

    expect(response.statusCode).toBe(200);
    const post = JSON.parse(response.body);
    expect(post.title).toBe('Как нанять Senior Tilda разработчика');
  });

  it('should allow ADMIN to list all posts including future scheduled ones via GET /admin/blog', async () => {
    const adminToken = app.jwt.sign({ id: 'admin-1', email: 'admin@fyxi.ru', role: 'ADMIN' });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/blog',
      headers: { Cookie: `token=${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    const posts = JSON.parse(response.body);
    expect(posts.length).toBe(2);
  });
});
