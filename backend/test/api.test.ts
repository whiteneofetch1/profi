import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

// Plugins & Routes to test
import authPlugin from '../src/plugins/auth';
import authRoutes from '../src/routes/auth';
import profileRoutes from '../src/routes/profiles';
import checkoutRoutes from '../src/routes/checkout';
import blogRoutes from '../src/routes/blog';
import adminRoutes from '../src/routes/admin';

describe('fyxi REST API Integration Tests', () => {
  let app: FastifyInstance;

  // Mock Prisma Database Client
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    devProfile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    clientProfile: {
      create: vi.fn(),
    },
    purchase: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    unlockedProfile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    platformConfig: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    blogPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Instantiate a separate Fastify instance for testing
    app = Fastify({ logger: false });

    // Register security
    await app.register(helmet);
    await app.register(cors);

    // Decorate app with mock Prisma
    app.decorate('prisma', mockPrisma);

    // Register auth utilities
    await app.register(authPlugin);

    // Register route prefix handlers (exactly matching Caddy reverse proxy)
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(profileRoutes, { prefix: '/profiles' });
    await app.register(checkoutRoutes, { prefix: '/checkout' });
    await app.register(blogRoutes, { prefix: '/blog' });
    await app.register(adminRoutes, { prefix: '/admin' });
  });

  // ---------------------------------------------------------------------------
  // 1. AUTHENTICATION ENDPOINTS
  // ---------------------------------------------------------------------------
  describe('POST /auth/register', () => {
    it('should successfully register a new developer user and issue JWT cookie', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue({
        id: 'mock-dev-id',
        email: 'test@fyxi.ru',
        role: 'DEVELOPER',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@fyxi.ru',
          password: 'securepassword2026',
          role: 'DEVELOPER',
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe('test@fyxi.ru');
      expect(body.user.role).toBe('DEVELOPER');

      // Check cookie headers
      const cookieHeader = response.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader?.toString()).toContain('token=');
    });

    it('should reject registration if email is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' }); // User exists

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'taken@fyxi.ru',
          password: 'securepassword2026',
          role: 'CLIENT',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('already exists');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. PROFILE GATING ENDPOINTS
  // ---------------------------------------------------------------------------
  describe('GET /profiles', () => {
    const mockDbProfiles = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        firstName: 'Иван',
        lastName: 'Смирнов',
        title: 'Senior Developer',
        specialization: 'DEVELOPER',
        bio: 'Senior Vue engineer',
        experienceYears: 6,
        skills: ['Vue', 'TS'],
        portfolioLinks: [],
        hourlyRate: 2000,
        monthlySalary: 160000,
        availability: 'FREE',
        isVerified: true,
        createdAt: new Date(),
        contactEmail: 'real-email@gmail.com',
        contactTelegram: '@real_tg',
        contactPhone: '+79991112233',
        user: { lastActive: new Date() },
      }
    ];

    it('should return masked and obfuscated contact details for anonymous guests', async () => {
      mockPrisma.devProfile.findMany.mockResolvedValue(mockDbProfiles);

      const response = await app.inject({
        method: 'GET',
        url: '/profiles',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data[0].id).toBe('11111111-1111-1111-1111-111111111111');
      expect(data[0].isUnlocked).toBe(false);

      // Gated Contacts MUST BE NULL for guests!
      expect(data[0].contactEmail).toBeNull();
      expect(data[0].contactTelegram).toBeNull();
      expect(data[0].contactPhone).toBeNull();
    });

    it('should reveal full contact details if the client has purchased access', async () => {
      mockPrisma.devProfile.findMany.mockResolvedValue(mockDbProfiles);
      
      // Mock purchased unlocking relationship
      mockPrisma.unlockedProfile.findMany.mockResolvedValue([
        { devProfileId: '11111111-1111-1111-1111-111111111111' }
      ]);

      // Generate mock authorized user token
      const mockToken = app.jwt.sign({ id: 'client-user-id', email: 'client@company.com', role: 'CLIENT' });

      const response = await app.inject({
        method: 'GET',
        url: '/profiles',
        headers: {
          Cookie: `token=${mockToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data[0].isUnlocked).toBe(true);
      
      // Gated Contacts MUST BE SHOWN for paying customers!
      expect(data[0].contactEmail).toBe('real-email@gmail.com');
      expect(data[0].contactTelegram).toBe('@real_tg');
      expect(data[0].contactPhone).toBe('+79991112233');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CHECKOUT & TRANSACTIONS
  // ---------------------------------------------------------------------------
  describe('POST /checkout/create', () => {
    it('should compute pricing correctly for single purchases and return YooKassa gateway redirect', async () => {
      mockPrisma.unlockedProfile.findMany.mockResolvedValue([]); // No profiles unlocked yet
      mockPrisma.platformConfig.findFirst.mockResolvedValue({
        flatRatePrice: 500,
        bundleCount: 5,
        bundlePrice: 2000,
      });
      mockPrisma.purchase.create.mockResolvedValue({ id: 'tx-123', amountPaid: 500 });

      const response = await app.inject({
        method: 'POST',
        url: '/checkout/create',
        payload: {
          devProfileIds: ['11111111-1111-1111-1111-111111111111'],
          email: 'guest@buyer.com', // Guest quick checkout
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.amount).toBe(500); // Charged standard flat rate
      expect(body.paymentUrl).toContain('/checkout/mock-gateway?paymentId=');
    });

    it('should apply agency package volume discount when purchasing 5+ items', async () => {
      mockPrisma.unlockedProfile.findMany.mockResolvedValue([]);
      mockPrisma.platformConfig.findFirst.mockResolvedValue({
        flatRatePrice: 500,
        bundleCount: 5,
        bundlePrice: 2000,
      });
      mockPrisma.purchase.create.mockResolvedValue({ id: 'tx-bundle', amountPaid: 2000 });

      const response = await app.inject({
        method: 'POST',
        url: '/checkout/create',
        payload: {
          devProfileIds: [
            '11111111-1111-1111-1111-111111111111',
            '22222222-2222-2222-2222-222222222222',
            '33333333-3333-3333-3333-333333333333',
            '44444444-4444-4444-4444-444444444444',
            '55555555-5555-5555-5555-555555555555'
          ],
          email: 'recruiter@agency.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Bundle discount saves budget! 2000 RUB instead of 2500 RUB!
      expect(body.amount).toBe(2000);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. BLOG & SEO MANAGEMENT ENDPOINTS
  // ---------------------------------------------------------------------------
  describe('GET /blog', () => {
    it('should return only published blog posts', async () => {
      const mockPublishedPost = {
        id: 'post-1',
        slug: 'test-article',
        title: 'Тестовая статья',
        description: 'Тестовое описание',
        category: 'Технологии',
        readTime: '5 мин',
        author: 'Алексей',
        authorRole: 'CEO',
        keywords: ['Vue', 'SEO'],
        content: '<p>Тело статьи...</p>',
        publishDate: new Date(Date.now() - 100000), // Published in the past
      };
      
      mockPrisma.blogPost.findMany.mockResolvedValue([mockPublishedPost]);

      const response = await app.inject({
        method: 'GET',
        url: '/blog',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.length).toBe(1);
      expect(data[0].slug).toBe('test-article');
    });
  });

  describe('GET /blog/:slug', () => {
    it('should return a published article successfully', async () => {
      const mockPublishedPost = {
        id: 'post-1',
        slug: 'published-slug',
        title: 'Опубликовано',
        description: 'Анонс',
        category: 'Дизайн',
        readTime: '4 мин',
        author: 'Алексей',
        authorRole: 'CEO',
        keywords: ['Дизайн'],
        content: '<h2>Дизайн</h2>',
        publishDate: new Date(Date.now() - 100000),
      };

      mockPrisma.blogPost.findUnique.mockResolvedValue(mockPublishedPost);

      const response = await app.inject({
        method: 'GET',
        url: '/blog/published-slug',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.slug).toBe('published-slug');
    });

    it('should block access and return 404 for a scheduled article in the future', async () => {
      const mockScheduledPost = {
        id: 'post-2',
        slug: 'scheduled-slug',
        title: 'В будущем',
        description: 'Запланировано',
        category: 'Дизайн',
        readTime: '4 мин',
        author: 'Алексей',
        authorRole: 'CEO',
        keywords: ['Дизайн'],
        content: '<h2>Будущее</h2>',
        publishDate: new Date(Date.now() + 100000), // In the future
      };

      mockPrisma.blogPost.findUnique.mockResolvedValue(mockScheduledPost);

      const response = await app.inject({
        method: 'GET',
        url: '/blog/scheduled-slug',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('не найдена или еще не опубликована');
    });
  });

  describe('Administrative Blog CMS Endpoints (with auth role ADMIN)', () => {
    const mockAdminToken = () => {
      return app.jwt.sign({ id: 'admin-id', email: 'admin@fyxi.ru', role: 'ADMIN' });
    };

    const mockDeveloperToken = () => {
      return app.jwt.sign({ id: 'dev-id', email: 'dev@fyxi.ru', role: 'DEVELOPER' });
    };

    it('should deny CMS access to non-admin developers', async () => {
      const token = mockDeveloperToken();
      const response = await app.inject({
        method: 'GET',
        url: '/admin/blog',
        headers: { Cookie: `token=${token}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('should allow admin to list all blog posts including scheduled ones', async () => {
      const token = mockAdminToken();
      const mockPosts = [
        { id: '1', slug: 'past', publishDate: new Date(Date.now() - 1000) },
        { id: '2', slug: 'future', publishDate: new Date(Date.now() + 100000) },
      ];
      mockPrisma.blogPost.findMany.mockResolvedValue(mockPosts);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/blog',
        headers: { Cookie: `token=${token}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.length).toBe(2);
    });

    it('should allow admin to create a new blog post', async () => {
      const token = mockAdminToken();
      const newPostData = {
        title: 'Новая статья',
        slug: 'novaya-statya',
        category: 'Технологии',
        readTime: '6 мин',
        author: 'Админ',
        authorRole: 'Главред',
        description: 'SEO анонс',
        content: '<h2>Текст</h2>',
        keywords: ['Prisma', 'Vitest'],
        publishDate: new Date().toISOString(),
      };

      mockPrisma.blogPost.create.mockResolvedValue({ id: 'new-id', ...newPostData });

      const response = await app.inject({
        method: 'POST',
        url: '/admin/blog',
        headers: { Cookie: `token=${token}` },
        payload: newPostData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.post.slug).toBe('novaya-statya');
    });

    it('should allow admin to update a blog post', async () => {
      const token = mockAdminToken();
      const updateData = {
        title: 'Обновленная статья',
        slug: 'obnovlennaya',
        category: 'Кейсы',
        readTime: '7 мин',
        author: 'Админ',
        authorRole: 'Главред',
        description: 'SEO анонс обновлен',
        content: '<h2>Новый текст</h2>',
        keywords: ['Обновление'],
        publishDate: new Date().toISOString(),
      };

      mockPrisma.blogPost.update.mockResolvedValue({ id: 'uuid-123', ...updateData });

      const response = await app.inject({
        method: 'PUT',
        url: '/admin/blog/550e8400-e29b-41d4-a716-446655440000',
        headers: { Cookie: `token=${token}` },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.post.category).toBe('Кейсы');
    });

    it('should allow admin to delete a blog post', async () => {
      const token = mockAdminToken();
      mockPrisma.blogPost.delete.mockResolvedValue({ id: 'uuid-123' });

      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/blog/550e8400-e29b-41d4-a716-446655440000',
        headers: { Cookie: `token=${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('успешно удалена');
    });
  });
});
