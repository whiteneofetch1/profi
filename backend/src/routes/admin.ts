import { FastifyInstance, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { slugify } from '../utils/translit';

export default async function adminRoutes(fastify: FastifyInstance) {
  // PUBLIC CLIENT ERROR LOGGING ENDPOINT (Bypasses Admin Firewall)
  fastify.post(
    '/errors/log',
    {
      schema: {
        body: Type.Object({
          message: Type.String(),
          stack: Type.Optional(Type.String()),
          source: Type.Optional(Type.String()),
          path: Type.Optional(Type.String()),
          level: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { message, stack, source, path, level } = request.body as any;
        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'];

        const errorLog = await fastify.prisma.errorLog.create({
          data: {
            message: message.substring(0, 500),
            stack: stack || null,
            source: source || 'FRONTEND',
            path: path || null,
            level: (level as any) || 'ERROR',
            ipAddress,
            userAgent,
          },
        });

        reply.send({ success: true, logId: errorLog.id });
      } catch (err: any) {
        fastify.log.error(err);
        reply.send({ success: false });
      }
    }
  );

  // Admin firewall middleware (runs before administrative routes)
  fastify.addHook('preHandler', async (request, reply) => {
    // Public client error logging endpoint bypasses admin auth
    if (request.url.endsWith('/errors/log')) {
      return;
    }
    await fastify.authenticate(request, reply);
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden: Administrative access required' });
    }
  });

  // 1. GET ALL PROFILES (FOR MODERATION)
  fastify.get('/profiles', async (request, reply) => {
    const profiles = await fastify.prisma.devProfile.findMany({
      include: {
        user: {
          select: {
            email: true,
            lastActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    reply.send(profiles);
  });

  // 2. APPROVE PROFILE FOR PUBLIC CATALOG
  fastify.post(
    '/profiles/:id/approve',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        body: Type.Object({ isApproved: Type.Boolean() }),
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: { isApproved: boolean } }>, reply) => {
      const { id } = request.params;
      const { isApproved } = request.body;

      const profile = await fastify.prisma.devProfile.update({
        where: { id },
        data: { isApproved },
      });

      reply.send({ success: true, message: `Profile approval status set to ${isApproved}`, profile });
    }
  );

  // 3. TOGGLE VERIFIED BADGE FOR PROFILE
  fastify.post(
    '/profiles/:id/verify',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        body: Type.Object({ isVerified: Type.Boolean() }),
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: { isVerified: boolean } }>, reply) => {
      const { id } = request.params;
      const { isVerified } = request.body;

      const profile = await fastify.prisma.devProfile.update({
        where: { id },
        data: { isVerified },
      });

      reply.send({ success: true, message: `Profile verification status set to ${isVerified}`, profile });
    }
  );

  // DELETE PROFILE BY ADMIN
  fastify.delete(
    '/profiles/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as any;

      const profile = await fastify.prisma.devProfile.findFirst({
        where: { OR: [{ id }, { slug: id }] },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Профиль специалиста не найден' });
      }

      await fastify.prisma.devProfile.delete({
        where: { id: profile.id },
      });

      reply.send({ success: true, message: 'Профиль специалиста успешно удалён' });
    }
  );

  // --- REVIEWS MODERATION ---
  fastify.get('/reviews', async (request, reply) => {
    const reviews = await fastify.prisma.review.findMany({
      include: {
        devProfile: {
          select: { firstName: true, lastName: true, slug: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    reply.send(reviews);
  });

  fastify.patch('/reviews/:id/visibility', {
    schema: {
      params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      body: Type.Object({ isHidden: Type.Boolean() })
    }
  }, async (request: FastifyRequest<{ Params: { id: string }, Body: { isHidden: boolean } }>, reply) => {
    const { id } = request.params;
    const { isHidden } = request.body;
    const review = await fastify.prisma.review.update({
      where: { id },
      data: { isHidden }
    });
    reply.send({ success: true, review });
  });

  fastify.delete('/reviews/:id', {
    schema: {
      params: Type.Object({ id: Type.String({ format: 'uuid' }) })
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;
    await fastify.prisma.review.delete({ where: { id } });
    reply.send({ success: true, message: 'Отзыв удален' });
  });

  // 4. GET AND UPDATE PLATFORM PRICING CONFIGURATION
  fastify.get('/config', async (request, reply) => {
    let config = await fastify.prisma.platformConfig.findFirst();
    if (!config) {
      config = await fastify.prisma.platformConfig.create({
        data: { flatRatePrice: 500, bundleCount: 5, bundlePrice: 2000 },
      });
    }
    reply.send(config);
  });

  fastify.post(
    '/config',
    {
      schema: {
        body: Type.Object({
          flatRatePrice: Type.Integer(),
          bundleCount: Type.Integer(),
          bundlePrice: Type.Integer(),
        }),
      },
    },
    async (request, reply) => {
      const body = request.body as any;

      let config = await fastify.prisma.platformConfig.findFirst();
      
      if (config) {
        config = await fastify.prisma.platformConfig.update({
          where: { id: config.id },
          data: body,
        });
      } else {
        config = await fastify.prisma.platformConfig.create({
          data: body,
        });
      }

      reply.send({ success: true, message: 'Platform config updated successfully', config });
    }
  );

  // 5. GET ALL BLOG POSTS (FOR CMS PANEL)
  fastify.get('/blog', async (request, reply) => {
    try {
      const posts = await fastify.prisma.blogPost.findMany({
        orderBy: {
          publishDate: 'desc',
        },
      });

      reply.send(posts);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to retrieve blog posts for admin panel.' });
    }
  });

  // 6. CREATE BLOG POST
  fastify.post(
    '/blog',
    {
      schema: {
        body: Type.Object({
          title: Type.String(),
          slug: Type.String(),
          category: Type.String(),
          readTime: Type.String(),
          author: Type.String(),
          authorRole: Type.String(),
          description: Type.String(),
          content: Type.String(),
          keywords: Type.Array(Type.String()),
          publishDate: Type.String(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const post = await fastify.prisma.blogPost.create({
          data: {
            title: body.title,
            slug: slugify(body.slug || body.title),
            category: body.category,
            readTime: body.readTime,
            author: body.author,
            authorRole: body.authorRole,
            description: body.description,
            content: body.content,
            keywords: body.keywords,
            publishDate: new Date(body.publishDate),
          },
        });
        reply.send({ success: true, post });
      } catch (err: any) {
        fastify.log.error(err);
        if (err.code === 'P2002') {
          return reply.status(400).send({ error: 'Статья с таким адресом (slug) уже существует.' });
        }
        return reply.status(500).send({ error: 'Failed to create blog post.' });
      }
    }
  );

  // 7. UPDATE BLOG POST
  fastify.put(
    '/blog/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        body: Type.Object({
          title: Type.String(),
          slug: Type.String(),
          category: Type.String(),
          readTime: Type.String(),
          author: Type.String(),
          authorRole: Type.String(),
          description: Type.String(),
          content: Type.String(),
          keywords: Type.Array(Type.String()),
          publishDate: Type.String(),
        }),
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply) => {
      try {
        const { id } = request.params;
        const body = request.body as any;

        const post = await fastify.prisma.blogPost.update({
          where: { id },
          data: {
            title: body.title,
            slug: body.slug,
            category: body.category,
            readTime: body.readTime,
            author: body.author,
            authorRole: body.authorRole,
            description: body.description,
            content: body.content,
            keywords: body.keywords,
            publishDate: new Date(body.publishDate),
          },
        });
        reply.send({ success: true, post });
      } catch (err: any) {
        fastify.log.error(err);
        if (err.code === 'P2002') {
          return reply.status(400).send({ error: 'Статья с таким адресом (slug) уже существует.' });
        }
        return reply.status(500).send({ error: 'Failed to update blog post.' });
      }
    }
  );

  // 8. DELETE BLOG POST
  fastify.delete(
    '/blog/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      try {
        const { id } = request.params;
        await fastify.prisma.blogPost.delete({
          where: { id },
        });
        reply.send({ success: true, message: 'Статья успешно удалена.' });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to delete blog post.' });
      }
    }
  );

  // 9. GET SYSTEM ERROR DIAGNOSTIC LOGS
  fastify.get('/errors', async (request, reply) => {
    try {
      const logs = await fastify.prisma.errorLog.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 100, // Latest 100 error logs
      });
      reply.send(logs);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to retrieve error logs.' });
    }
  });

  // 10. MARK ERROR LOG AS RESOLVED
  fastify.patch(
    '/errors/:id/resolve',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        body: Type.Object({ resolved: Type.Boolean() }),
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: { resolved: boolean } }>, reply) => {
      try {
        const { id } = request.params;
        const { resolved } = request.body;

        const updatedLog = await fastify.prisma.errorLog.update({
          where: { id },
          data: {
            resolved,
            resolvedAt: resolved ? new Date() : null,
          },
        });

        reply.send({ success: true, log: updatedLog });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to update error log status.' });
      }
    }
  );

  // 11. CLEAR RESOLVED OR ALL ERROR LOGS
  fastify.delete('/errors/clear', async (request, reply) => {
    try {
      const { all } = request.query as any;
      if (all === 'true' || all === true) {
        await fastify.prisma.errorLog.deleteMany({});
        return reply.send({ success: true, message: 'Весь журнал ошибок полностью очищен.' });
      }
      await fastify.prisma.errorLog.deleteMany({
        where: { resolved: true },
      });
      reply.send({ success: true, message: 'Все исправленные ошибки успешно удалены из журнала.' });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to clear error logs.' });
    }
  });
}
