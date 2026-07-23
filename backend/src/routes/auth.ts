import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { Type } from '@sinclair/typebox';

export default async function authRoutes(fastify: FastifyInstance) {
  
  // REGISTER ENDPOINT
  fastify.post(
    '/register',
    {
      schema: {
        body: Type.Object({
          email: Type.String({ format: 'email' }),
          password: Type.String({ minLength: 6 }),
          role: Type.Union([Type.Literal('CLIENT'), Type.Literal('DEVELOPER')]),
        }),
      },
    },
    async (request, reply) => {
      const { email, password, role } = request.body as any;

      // Check if user already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(400).send({ error: 'Пользователь с таким Email уже зарегистрирован. Попробуйте войти.' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const crypto = await import('crypto');
      const verificationToken = crypto.randomBytes(24).toString('hex');

      // Create user
      const user = await fastify.prisma.user.create({
        data: {
          email,
          passwordHash,
          role,
          isEmailVerified: false,
          verificationToken,
        },
      });

      // If they are a client, create empty ClientProfile
      if (role === 'CLIENT') {
        await fastify.prisma.clientProfile.create({
          data: { userId: user.id },
        });
      }

      const verifyUrl = `${process.env.FRONTEND_URL || 'https://fyxi.ru'}/cabinet?verifyToken=${verificationToken}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; background: #0b0a14; color: #ffffff; padding: 2rem; border-radius: 12px;">
          <h2 style="color: #8b5cf6;">Подтверждение Email на fyxi.ru</h2>
          <p>Здравствуйте! Вы зарегистрировались на платформе fyxi.ru с email <strong>${email}</strong>.</p>
          <p>Пожалуйста, подтвердите вашу почту, перейдя по ссылке ниже:</p>
          <p style="margin: 1.5rem 0;">
            <a href="${verifyUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: #ffffff; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Подтвердить Email</a>
          </p>
          <p style="font-size: 0.85rem; color: #cbd5e1;">Если кнопка не работает, скопируйте эту ссылку в браузер:<br/><a href="${verifyUrl}" style="color: #06b6d4;">${verifyUrl}</a></p>
          <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 1.5rem;">Если вы не регистрировались на сайте, просто проигнорируйте это письмо.</p>
        </div>
      `;

      const { sendEmailNotification } = await import('../services/notifications');
      sendEmailNotification(email, 'Подтверждение Email | fyxi.ru', emailHtml).catch(() => {});

      // Sign JWT Token for instant login
      const token = await reply.jwtSign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      reply
        .setCookie('token', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        })
        .send({
          success: true,
          message: 'Регистрация успешна. Вы авторизованы. На вашу почту отправлено письмо для подтверждения.',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: false,
          },
        });
    }
  );

  // VERIFY EMAIL ENDPOINT
  fastify.post(
    '/verify-email',
    {
      schema: {
        body: Type.Object({
          token: Type.String(),
        }),
      },
    },
    async (request, reply) => {
      const { token } = request.body as any;

      const user = await fastify.prisma.user.findFirst({
        where: { verificationToken: token },
      });

      if (!user) {
        return reply.status(400).send({ error: 'Ссылка для подтверждения недействительна или уже использована.' });
      }

      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          verificationToken: null,
        },
      });

      // Generate JWT Token and log them in
      const jwtToken = await reply.jwtSign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      reply
        .setCookie('token', jwtToken, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        })
        .send({
          success: true,
          message: 'Ваш Email успешно подтвержден!',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        });
    }
  );

  // LOGIN ENDPOINT
  fastify.post(
    '/login',
    {
      schema: {
        body: Type.Object({
          email: Type.String({ format: 'email' }),
          password: Type.String(),
        }),
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as any;
      const cleanEmail = (email || '').toLowerCase().trim();

      let user = await fastify.prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { devProfile: true },
      });

      // Emergency / Auto-bootstrap for Superadmin account
      if (cleanEmail === 'admin@fyxi.ru' && password === 'admin123456') {
        const passwordHash = await bcrypt.hash('admin123456', 10);
        if (!user) {
          user = await fastify.prisma.user.create({
            data: {
              email: 'admin@fyxi.ru',
              passwordHash,
              role: 'ADMIN',
              isEmailVerified: true,
            },
            include: { devProfile: true },
          });
        } else if (user.role !== 'ADMIN' || !(await bcrypt.compare(password, user.passwordHash))) {
          user = await fastify.prisma.user.update({
            where: { id: user.id },
            data: {
              passwordHash,
              role: 'ADMIN',
              isEmailVerified: true,
            },
            include: { devProfile: true },
          });
        }
      }

      if (!user || !user.passwordHash) {
        return reply.status(401).send({ error: 'Неверный адрес почты или пароль' });
      }

      // Validate password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return reply.status(401).send({ error: 'Неверный адрес почты или пароль' });
      }

      // Update Last Active
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() },
      });

      // Generate JWT Token
      const token = await reply.jwtSign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      reply
        .setCookie('token', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        })
        .send({
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            devProfile: user.devProfile,
          },
        });
    }
  );

  // LOGOUT ENDPOINT
  fastify.post('/logout', async (request, reply) => {
    reply
      .clearCookie('token', { path: '/' })
      .send({ success: true, message: 'Logged out successfully' });
  });

  // GET AUTHENTICATED USER
  fastify.get(
    '/me',
    async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        // Return 200 with null user instead of throwing 401 to keep browser console clean
        return reply.send({ user: null });
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
        include: {
          devProfile: true,
          clientProfile: true,
        },
      });

      if (!user) {
        return reply.send({ user: null });
      }

      // Update Last Active
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() },
      });

      reply.send({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          lastActive: user.lastActive,
          devProfile: user.devProfile,
          clientProfile: user.clientProfile,
        },
      });
    }
  );

  // FORGOT PASSWORD ENDPOINT
  fastify.post(
    '/forgot-password',
    {
      schema: {
        body: Type.Object({
          email: Type.String({ format: 'email' }),
        }),
      },
    },
    async (request, reply) => {
      const { email } = request.body as any;

      const user = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return reply.send({ success: true, message: 'Если такой Email зарегистрирован, ссылка для сброса пароля отправлена.' });
      }

      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(24).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600 * 1000);

      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpires,
        },
      });

      const resetUrl = `https://fyxi.ru/cabinet?resetToken=${resetToken}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; background: #0b0a14; color: #ffffff; padding: 2rem; border-radius: 12px;">
          <h2 style="color: #8b5cf6;">Сброс пароля на fyxi.ru</h2>
          <p>Вы запросили сброс пароля для аккаунта <strong>${email}</strong>.</p>
          <p>Перейдите по ссылке ниже для установки нового пароля (ссылка действительна 1 час):</p>
          <p style="margin: 1.5rem 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: #ffffff; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: 600;">Установить новый пароль</a>
          </p>
          <p style="font-size: 0.8rem; color: #94a3b8;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        </div>
      `;

      const { sendEmailNotification } = await import('../services/notifications');
      sendEmailNotification(email, 'Сброс пароля на платформе fyxi.ru', emailHtml).catch(() => {});

      reply.send({ success: true, message: 'Ссылка для восстановления пароля отправлена на ваш Email.' });
    }
  );

  // RESET PASSWORD ENDPOINT
  fastify.post(
    '/reset-password',
    {
      schema: {
        body: Type.Object({
          token: Type.String(),
          newPassword: Type.String({ minLength: 6 }),
        }),
      },
    },
    async (request, reply) => {
      const { token, newPassword } = request.body as any;

      const user = await fastify.prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpires: { gt: new Date() },
        },
      });

      if (!user) {
        return reply.status(400).send({ error: 'Ссылка для сброса пароля недействительна или истек срок ее действия.' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          isEmailVerified: true, // Resetting password implicitly verifies email
          verificationToken: null,
          resetToken: null,
          resetTokenExpires: null,
        },
      });

      reply.send({ success: true, message: 'Пароль успешно обновлен! Теперь вы можете войти с новым паролем.' });
    }
  );

  // CHANGE PASSWORD (AUTHENTICATED)
  fastify.post(
    '/change-password',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: Type.Object({
          currentPassword: Type.String(),
          newPassword: Type.String({ minLength: 6 }),
        }),
      },
    },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body as any;

      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
      });

      if (!user || !user.passwordHash) {
        return reply.status(404).send({ error: 'Пользователь не найден' });
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return reply.status(400).send({ error: 'Неверный текущий пароль' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      reply.send({ success: true, message: 'Пароль успешно изменён' });
    }
  );
}
