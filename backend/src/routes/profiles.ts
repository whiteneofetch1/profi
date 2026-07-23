import { FastifyInstance, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { generateProfileSlug } from '../utils/translit';

export default async function profileRoutes(fastify: FastifyInstance) {
  async function findProfileByIdOrSlug(param: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
    const shortIdMatch = param.match(/-([0-9a-fA-F]{8})$/);
    const repo = fastify.prisma.devProfile as any;
    
    let whereClause: any;
    if (isUuid) {
      whereClause = { OR: [{ id: param }, { slug: param }] };
    } else if (shortIdMatch) {
      whereClause = { OR: [{ slug: param }, { id: { startsWith: shortIdMatch[1] } }] };
    } else {
      whereClause = { slug: param };
    }

    if (typeof repo.findFirst === 'function') {
      return await repo.findFirst({
        where: whereClause,
        include: {
          user: {
            select: {
              lastActive: true,
            },
          },
        },
      });
    } else {
      return await repo.findUnique({
        where: { id: param },
        include: {
          user: {
            select: {
              lastActive: true,
            },
          },
        },
      });
    }
  }

  
  // 1. GET ALL APPROVED PROFILES (CATALOG)
  fastify.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          specialization: Type.Optional(Type.Union([Type.Literal('DEVELOPER'), Type.Literal('DESIGNER'), Type.Literal('FULLSTACK'), Type.Literal('OTHER')])),
          skill: Type.Optional(Type.String()),
          verified: Type.Optional(Type.Boolean()),
          availability: Type.Optional(Type.Union([Type.Literal('FREE'), Type.Literal('BUSY'), Type.Literal('OPEN_FOR_OFFERS')])),
        }),
      },
    },
    async (request: FastifyRequest<{ Querystring: { specialization?: 'DEVELOPER'|'DESIGNER'|'FULLSTACK'|'OTHER', skill?: string, verified?: boolean, availability?: 'FREE'|'BUSY'|'OPEN_FOR_OFFERS' } }>, reply) => {
      const { specialization, skill, verified, availability } = request.query;

      // Construct filter query
      const whereClause: any = {
        isApproved: true, // Only show approved specialists in the catalog
      };

      if (specialization) whereClause.specialization = specialization;
      if (verified !== undefined) whereClause.isVerified = verified;
      if (availability) whereClause.availability = availability;
      if (skill) {
        whereClause.skills = {
          has: skill,
        };
      }

      // Fetch from DB
      const profiles = await fastify.prisma.devProfile.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              lastActive: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // GATING LOGIC: Read current user's unlocked list if they are authenticated
      let unlockedProfileIds: String[] = [];
      const authHeader = request.headers.authorization;
      const cookieToken = request.cookies ? request.cookies.token : null;
      const rawToken = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.substring(7) : cookieToken;
      if (rawToken) {
        try {
          const payload = fastify.jwt.verify(rawToken) as any;
          if (payload && payload.id) {
            const activePurchases = await fastify.prisma.unlockedProfile.findMany({
              where: {
                purchase: {
                  clientId: payload.id,
                  status: 'COMPLETED',
                },
              },
              select: {
                devProfileId: true,
              },
            });
            unlockedProfileIds = activePurchases.map(p => p.devProfileId);
          }
        } catch (err) {
          // Guest mode; safely ignore invalid token
        }
      }

      // Format response, strictly obfuscating gated contact data
      const gatedProfiles = profiles.map(profile => {
        const isUnlocked = unlockedProfileIds.includes(profile.id);
        const slug = profile.slug || generateProfileSlug(profile.firstName, profile.lastName, profile.id);

        return {
          id: profile.id,
          slug,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl || null,
          title: profile.title,
          specialization: profile.specialization,
          bio: profile.bio,
          experienceYears: profile.experienceYears,
          skills: profile.skills,
          portfolioLinks: profile.portfolioLinks,
          hourlyRate: profile.hourlyRate,
          monthlySalary: profile.monthlySalary,
          availability: profile.availability,
          isVerified: profile.isVerified,
          lastActive: profile.user.lastActive,
          createdAt: profile.createdAt,
          isUnlocked, // Boolean flag for Nuxt UI to toggle layouts
          
          // Gated Contacts
          contactEmail: isUnlocked ? profile.contactEmail : null,
          contactTelegram: isUnlocked ? profile.contactTelegram : null,
          contactPhone: isUnlocked ? profile.contactPhone : null,
        };
      });

      reply.send(gatedProfiles);
    }
  );

  // 2. GET SINGLE PROFILE BY ID
  fastify.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const { id } = request.params;

      const profile = await findProfileByIdOrSlug(id);

      if (!profile) {
        return reply.status(404).send({ error: 'Specialist profile not found' });
      }

      // Check unlock status for active user
      let isUnlocked = false;
      const singleAuthHeader = request.headers.authorization;
      const singleCookieToken = request.cookies ? request.cookies.token : null;
      const singleToken = (singleAuthHeader && singleAuthHeader.startsWith('Bearer ')) ? singleAuthHeader.substring(7) : singleCookieToken;
      if (singleToken) {
        try {
          const payload = fastify.jwt.verify(singleToken) as any;
          if (payload && payload.id) {
            // Admins or the developer themselves can always see their own contacts
            if (payload.role === 'ADMIN' || profile.userId === payload.id) {
              isUnlocked = true;
            } else {
              const unlockRecord = await fastify.prisma.unlockedProfile.findFirst({
                where: {
                  devProfileId: profile.id,
                  purchase: {
                    clientId: payload.id,
                    status: 'COMPLETED',
                  },
                },
              });
              isUnlocked = !!unlockRecord;
            }
          }
        } catch (err) {
          // Guest mode; safely ignore invalid token
        }
      }

      const slug = profile.slug || generateProfileSlug(profile.firstName, profile.lastName, profile.id);

      reply.send({
        id: profile.id,
        slug,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.avatarUrl || null,
        title: profile.title,
        specialization: profile.specialization,
        bio: profile.bio,
        experienceYears: profile.experienceYears,
        skills: profile.skills,
        portfolioLinks: profile.portfolioLinks,
        hourlyRate: profile.hourlyRate,
        monthlySalary: profile.monthlySalary,
        availability: profile.availability,
        isVerified: profile.isVerified,
        isApproved: profile.isApproved,
        lastActive: profile.user.lastActive,
        createdAt: profile.createdAt,
        isUnlocked,
        
        // Gated Contacts
        contactEmail: isUnlocked ? profile.contactEmail : null,
        contactTelegram: isUnlocked ? profile.contactTelegram : null,
        contactPhone: isUnlocked ? profile.contactPhone : null,
      });
    }
  );

  // 3. CREATE / UPDATE SPECIALIST'S OWN PROFILE
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: Type.Object({
          firstName: Type.String(),
          lastName: Type.String(),
          avatarUrl: Type.Optional(Type.String()),
          title: Type.String(),
          specialization: Type.Union([Type.Literal('DEVELOPER'), Type.Literal('DESIGNER'), Type.Literal('FULLSTACK'), Type.Literal('OTHER')]),
          bio: Type.String(),
          experienceYears: Type.Integer(),
          skills: Type.Array(Type.String()),
          portfolioLinks: Type.Array(Type.String()),
          hourlyRate: Type.Optional(Type.Integer()),
          monthlySalary: Type.Optional(Type.Integer()),
          availability: Type.Optional(Type.Union([Type.Literal('FREE'), Type.Literal('BUSY'), Type.Literal('OPEN_FOR_OFFERS')])),
          contactEmail: Type.String({ format: 'email' }),
          contactTelegram: Type.String(),
          contactPhone: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      // Must be a developer
      if (request.user.role !== 'DEVELOPER') {
        return reply.status(403).send({ error: 'Forbidden: Only users with DEVELOPER role can edit profiles' });
      }

      const body = request.body as any;

      // Create or update record
      const profile = await fastify.prisma.devProfile.upsert({
        where: { userId: request.user.id },
        update: {
          slug: generateProfileSlug(body.firstName, body.lastName, request.user.id),
          firstName: body.firstName,
          lastName: body.lastName,
          avatarUrl: body.avatarUrl || null,
          title: body.title,
          specialization: body.specialization,
          bio: body.bio,
          experienceYears: body.experienceYears,
          skills: body.skills,
          portfolioLinks: body.portfolioLinks,
          hourlyRate: body.hourlyRate,
          monthlySalary: body.monthlySalary,
          availability: body.availability || 'FREE',
          contactEmail: body.contactEmail,
          contactTelegram: body.contactTelegram,
          contactPhone: body.contactPhone,
          isApproved: false, // Force re-moderation on profile updates
        },
        create: {
          userId: request.user.id,
          slug: generateProfileSlug(body.firstName, body.lastName, request.user.id),
          firstName: body.firstName,
          lastName: body.lastName,
          avatarUrl: body.avatarUrl || null,
          title: body.title,
          specialization: body.specialization,
          bio: body.bio,
          experienceYears: body.experienceYears,
          skills: body.skills,
          portfolioLinks: body.portfolioLinks,
          hourlyRate: body.hourlyRate,
          monthlySalary: body.monthlySalary,
          availability: body.availability || 'FREE',
          contactEmail: body.contactEmail,
          contactTelegram: body.contactTelegram,
          contactPhone: body.contactPhone,
          isApproved: false, // Requires admin moderation
        },
      });

      reply.send({
        success: true,
        message: 'Profile submitted to moderation queue',
        profile,
      });
    }
  );

  // 5. POST VERIFIED REVIEW FOR SPECIALIST PROFILE
  fastify.post(
    '/:id/reviews',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          authorName: Type.String(),
          rating: Type.Integer({ minimum: 1, maximum: 5 }),
          comment: Type.String({ minLength: 5 }),
        }),
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: { authorName: string, rating: number, comment: string } }>, reply) => {
      if (request.user.role !== 'CLIENT') {
        return reply.status(403).send({ error: 'Только клиенты могут оставлять отзывы' });
      }

      const { id } = request.params;
      const { authorName, rating, comment } = request.body;

      const profile = await findProfileByIdOrSlug(id);

      if (!profile) {
        return reply.status(404).send({ error: 'Specialist profile not found' });
      }

      // Check if client has a COMPLETED purchase for this profile
      const unlockRecord = await fastify.prisma.unlockedProfile.findFirst({
        where: {
          devProfileId: profile.id,
          purchase: {
            clientId: request.user.id,
            status: 'COMPLETED',
          },
        },
      });

      if (!unlockRecord) {
        return reply.status(403).send({ error: 'Вы не можете оставить отзыв, так как не покупали контакты этого специалиста' });
      }

      // Prevent duplicate reviews from same client on same profile
      const existingReview = await fastify.prisma.review.findFirst({
        where: {
          devProfileId: profile.id,
          clientId: request.user.id,
        },
      });

      let review;
      if (existingReview) {
        review = await fastify.prisma.review.update({
          where: { id: existingReview.id },
          data: {
            authorName: authorName.trim(),
            rating,
            comment: comment.trim(),
            isVerified: true,
          },
        });
      } else {
        review = await fastify.prisma.review.create({
          data: {
            devProfileId: profile.id,
            clientId: request.user.id,
            authorName: authorName.trim(),
            rating,
            comment: comment.trim(),
            isVerified: true,
          },
        });
      }

      reply.send({ success: true, message: 'Спасибо за отзыв! Отзыв успешно опубликован.', review });
    }
  );

  // 6. GET ALL REVIEWS FOR SPECIALIST PROFILE
  fastify.get(
    '/:id/reviews',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const { id } = request.params;

      const profile = await findProfileByIdOrSlug(id);
      const devProfileId = profile ? profile.id : id;

      const reviews = await fastify.prisma.review.findMany({
        where: { devProfileId },
        orderBy: { createdAt: 'desc' },
      });

      const averageRating = reviews.length > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
        : 5.0;

      reply.send({
        reviews,
        reviewCount: reviews.length,
        averageRating,
      });
    }
  );

  // 7. INSTANT PROJECT BRIEF DISPATCH (CONSTRUCT BRIEF)
  fastify.post(
    '/brief/send',
    {
      schema: {
        body: Type.Object({
          devProfileIds: Type.Array(Type.String()),
          clientName: Type.String(),
          clientEmail: Type.String({ format: 'email' }),
          projectType: Type.String(),
          budget: Type.String(),
          deadline: Type.String(),
          figmaLink: Type.Optional(Type.String()),
          description: Type.String(),
        }),
      },
    },
    async (request, reply) => {
      const body = request.body as any;

      const profiles = await fastify.prisma.devProfile.findMany({
        where: { id: { in: body.devProfileIds } },
      });

      // Save Project Brief in DB for each targeted developer
      for (const profile of profiles) {
        await fastify.prisma.projectBrief.create({
          data: {
            devProfileId: profile.id,
            clientName: body.clientName,
            clientEmail: body.clientEmail,
            projectType: body.projectType,
            budget: body.budget,
            deadline: body.deadline,
            description: body.description + (body.figmaLink ? `\n\nFigma: ${body.figmaLink}` : ''),
          },
        }).catch(err => fastify.log.error(err));
      }

      const briefText = `📋 **Новый бриф на проект с fyxi.ru!**\n\n` +
        `👤 **Заказчик:** ${body.clientName} (${body.clientEmail})\n` +
        `🏷 **Тип проекта:** ${body.projectType}\n` +
        `💰 **Бюджет:** ${body.budget}\n` +
        `⏳ **Дедлайн:** ${body.deadline}\n` +
        (body.figmaLink ? `🎨 **Ссылка Figma:** ${body.figmaLink}\n` : '') +
        `📝 **Описание:** ${body.description}\n\n` +
        `👥 **Выбранные специалисты (${profiles.length}):**\n` +
        profiles.map(p => `• ${p.firstName} ${p.lastName} (${p.title})`).join('\n');

      const { sendTelegramMessage, sendEmailNotification } = await import('../services/notifications');
      
      sendTelegramMessage(briefText).catch(() => {});
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; background: #0b0a14; color: #ffffff; padding: 2rem; border-radius: 12px;">
          <h2 style="color: #06b6d4;">Бриф отправлен специалистам на fyxi.ru</h2>
          <p>Здравствуйте, <strong>${body.clientName}</strong>!</p>
          <p>Ваше техническое задание по проекту <strong>${body.projectType}</strong> успешно отправлено выбранным исполнителям.</p>
          <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <p><strong>Бюджет:</strong> ${body.budget} | <strong>Сроки:</strong> ${body.deadline}</p>
            <p><strong>Описание:</strong> ${body.description}</p>
          </div>
          <p style="color: #94a3b8;">Исполнители свяжутся с вами в ближайшее время по указанному Email: ${body.clientEmail}</p>
        </div>
      `;
      sendEmailNotification(body.clientEmail, `Бриф по проекту "${body.projectType}" отправлен | fyxi.ru`, emailHtml).catch(() => {});

      reply.send({ success: true, message: 'Бриф успешно отправлен специалистам' });
    }
  );

  // 8. GET INCOMING BRIEFS FOR LOGGED-IN DEVELOPER
  fastify.get(
    '/my-briefs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== 'DEVELOPER') {
        return reply.status(403).send({ error: 'Только специалисты могут просматривать входящие брифы' });
      }

      const devProfile = await fastify.prisma.devProfile.findUnique({
        where: { userId: request.user.id },
      });

      if (!devProfile) {
        return reply.send({ briefs: [] });
      }

      const briefs = await fastify.prisma.projectBrief.findMany({
        where: { devProfileId: devProfile.id },
        orderBy: { createdAt: 'desc' },
      });

      reply.send({ briefs });
    }
  );

  // 9. GET REVIEWS FOR LOGGED-IN DEVELOPER
  fastify.get(
    '/my-reviews',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== 'DEVELOPER') {
        return reply.status(403).send({ error: 'Только специалисты могут просматривать свои отзывы' });
      }

      const devProfile = await fastify.prisma.devProfile.findUnique({
        where: { userId: request.user.id },
      });

      if (!devProfile) {
        return reply.send({ reviews: [], averageRating: 5.0, count: 0 });
      }

      const reviews = await fastify.prisma.review.findMany({
        where: { devProfileId: devProfile.id },
        orderBy: { createdAt: 'desc' },
      });

      const averageRating = reviews.length > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
        : 5.0;

      reply.send({ reviews, averageRating, count: reviews.length });
    }
  );

  // 10. GET DEVELOPER STATS DASHBOARD
  fastify.get(
    '/my-stats',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== 'DEVELOPER') {
        return reply.status(403).send({ error: 'Только специалисты могут смотреть статистику' });
      }

      const devProfile = await fastify.prisma.devProfile.findUnique({
        where: { userId: request.user.id },
        include: {
          reviews: true,
          unlockedItems: true,
          briefs: true,
        },
      });

      if (!devProfile) {
        return reply.send({
          unlocksCount: 0,
          briefsCount: 0,
          reviewsCount: 0,
          averageRating: 5.0,
        });
      }

      const reviewsCount = devProfile.reviews.length;
      const averageRating = reviewsCount > 0
        ? Number((devProfile.reviews.reduce((acc, r) => acc + r.rating, 0) / reviewsCount).toFixed(1))
        : 5.0;

      reply.send({
        unlocksCount: devProfile.unlockedItems.length,
        briefsCount: devProfile.briefs.length,
        reviewsCount,
        averageRating,
      });
    }
  );
}
