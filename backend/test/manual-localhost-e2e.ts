import Fastify from 'fastify';
import authPlugin from '../src/plugins/auth';
import profileRoutes from '../src/routes/profiles';
import authRoutes from '../src/routes/auth';
import checkoutRoutes from '../src/routes/checkout';
import adminRoutes from '../src/routes/admin';

async function runLocalhostE2ETest() {
  console.log('🚀 Starting Localhost HTTP Server for Manual E2E Verification...');

  const mockProfiles = [
    {
      id: 'aae529f8-1111-4000-a000-000000000001',
      userId: 'user-sofiya',
      slug: null, // Null in DB to test fallback!
      firstName: 'София',
      lastName: 'Иванова',
      title: 'Junior Tilda Designer',
      specialization: 'DESIGNER',
      bio: 'Дизайнер сайтов на Tilda Zero Block',
      experienceYears: 2,
      skills: ['Tilda', 'Zero Block', 'Figma'],
      portfolioLinks: [],
      hourlyRate: 1500,
      monthlySalary: 100000,
      availability: 'FREE',
      isVerified: true,
      isApproved: true,
      contactEmail: 'sofiya@fyxi.ru',
      contactTelegram: '@sofiya_design',
      contactPhone: '+79991112233',
      createdAt: new Date(),
      user: { lastActive: new Date() },
    },
    {
      id: '9719fec7-2222-4000-a000-000000000002',
      userId: 'user-ilya',
      slug: null, // Null in DB to test fallback!
      firstName: 'Илья',
      lastName: 'Макаров',
      title: 'Fullstack Tilda Engineer',
      specialization: 'DEVELOPER',
      bio: 'Дорабатываю сайты на Tilda с помощью кода',
      experienceYears: 4,
      skills: ['JavaScript', 'Zero Block', 'CSS'],
      portfolioLinks: [],
      hourlyRate: 2000,
      monthlySalary: 160000,
      availability: 'OPEN_FOR_OFFERS',
      isVerified: true,
      isApproved: true,
      contactEmail: 'ilya@fyxi.ru',
      contactTelegram: '@ilya_code',
      contactPhone: '+79992223344',
      createdAt: new Date(),
      user: { lastActive: new Date() },
    }
  ];

  const mockReviews: any[] = [];

  const mockPrisma = {
    user: {
      findUnique: async () => null,
      create: async (args: any) => ({ id: 'new-user-1', email: args.data.email, role: args.data.role }),
      update: async () => ({}),
    },
    devProfile: {
      findMany: async () => mockProfiles,
      findFirst: async (args: any) => {
        if (args?.where?.OR) {
          for (const cond of args.where.OR) {
            if (cond.id) {
              const p = mockProfiles.find(item => item.id === cond.id);
              if (p) return p;
            }
            if (cond.slug) {
              const p = mockProfiles.find(item => item.slug === cond.slug);
              if (p) return p;
            }
            if (cond.id?.startsWith) {
              const prefix = cond.id.startsWith;
              const p = mockProfiles.find(item => item.id.startsWith(prefix));
              if (p) return p;
            }
          }
        }
        return null;
      },
      findUnique: async (args: any) => mockProfiles.find(p => p.id === args.where.id) || null,
      upsert: async (args: any) => {
        const existing = mockProfiles.find(p => p.userId === args.where.userId);
        if (existing) {
          Object.assign(existing, args.update);
          return existing;
        }
        const created = { id: 'new-profile-id', userId: args.where.userId, ...args.create };
        mockProfiles.push(created as any);
        return created;
      },
    },
    unlockedProfile: {
      findMany: async () => [],
    },
    review: {
      create: async (args: any) => {
        const rev = { id: `rev-${Date.now()}`, ...args.data, createdAt: new Date() };
        mockReviews.push(rev);
        return rev;
      },
      findMany: async (args: any) => mockReviews.filter(r => r.devProfileId === args.where.devProfileId),
    }
  };

  const app = Fastify();
  app.decorate('prisma', mockPrisma as any);
  await app.register(authPlugin);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(profileRoutes, { prefix: '/api/profiles' });
  await app.register(checkoutRoutes, { prefix: '/api/checkout' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  const PORT = 5012;
  await app.listen({ port: PORT, host: '127.0.0.1' });
  console.log(`✅ Localhost E2E Server running at http://127.0.0.1:${PORT}`);

  try {
    // TEST 1: GET /api/auth/me without token -> expects 401 Unauthorized
    console.log('\n--- [TEST 1] GET /api/auth/me (Unauthorized Check) ---');
    const res1 = await fetch(`http://127.0.0.1:${PORT}/api/auth/me`);
    const data1 = await res1.json() as any;
    console.log('HTTP Status:', res1.status);
    console.log('Response Body:', data1);
    if (res1.status === 401 && data1.error.includes('Unauthorized')) {
      console.log('👉 RESULT: PASS (Correct 401 error for guest)');
    } else {
      throw new Error('TEST 1 FAILED');
    }

    // TEST 2: GET /api/profiles/sofiya-26-ivanova-aae529f8 -> expects Sofiya's profile (200 OK)
    console.log('\n--- [TEST 2] GET /api/profiles/sofiya-26-ivanova-aae529f8 (Short ID Slug) ---');
    const res2 = await fetch(`http://127.0.0.1:${PORT}/api/profiles/sofiya-26-ivanova-aae529f8`);
    const data2 = await res2.json() as any;
    console.log('HTTP Status:', res2.status);
    console.log('Fetched Name:', `${data2.firstName} ${data2.lastName}`);
    if (res2.status === 200 && data2.firstName === 'София') {
      console.log('👉 RESULT: PASS (Successfully fetched profile by short ID slug)');
    } else {
      throw new Error('TEST 2 FAILED');
    }

    // TEST 3: GET /api/profiles/ilya-29-makarov-9719fec7 -> expects Ilya's profile (200 OK)
    console.log('\n--- [TEST 3] GET /api/profiles/ilya-29-makarov-9719fec7 (Short ID Fallback) ---');
    const res3 = await fetch(`http://127.0.0.1:${PORT}/api/profiles/ilya-29-makarov-9719fec7`);
    const data3 = await res3.json() as any;
    console.log('HTTP Status:', res3.status);
    console.log('Fetched Title:', data3.title);
    if (res3.status === 200 && data3.firstName === 'Илья') {
      console.log('👉 RESULT: PASS (Successfully fetched profile by short ID fallback)');
    } else {
      throw new Error('TEST 3 FAILED');
    }

    // TEST 4: POST /api/profiles/ilya-29-makarov-9719fec7/reviews -> post customer review via short ID slug
    console.log('\n--- [TEST 4] POST /api/profiles/ilya-29-makarov-9719fec7/reviews (Review via Short ID) ---');
    const res4 = await fetch(`http://127.0.0.1:${PORT}/api/profiles/ilya-29-makarov-9719fec7/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorName: 'Дмитрий (ООО Сфера)',
        rating: 5,
        comment: 'Отличный специалист! Быстро настроил кастомный код в Zero Block.'
      })
    });
    const data4 = await res4.json() as any;
    console.log('HTTP Status:', res4.status);
    console.log('Response Body:', data4);
    if (res4.status === 200 && data4.success) {
      console.log('👉 RESULT: PASS (Review posted successfully)');
    } else {
      throw new Error('TEST 4 FAILED');
    }

    // TEST 5: GET /api/profiles/non-existent-user-87654321 -> expects 404
    console.log('\n--- [TEST 5] GET /api/profiles/non-existent-user-87654321 (404 Check) ---');
    const res5 = await fetch(`http://127.0.0.1:${PORT}/api/profiles/non-existent-user-87654321`);
    const data5 = await res5.json() as any;
    console.log('HTTP Status:', res5.status);
    console.log('Response Body:', data5);
    if (res5.status === 404) {
      console.log('👉 RESULT: PASS (Correct 404 error)');
    } else {
      throw new Error('TEST 5 FAILED');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL LOCALHOST E2E MANUAL TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('❌ E2E TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runLocalhostE2ETest();
