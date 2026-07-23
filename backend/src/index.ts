import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import dotenv from 'dotenv';

import rateLimit from '@fastify/rate-limit';

// Plugins
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';

// Routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profiles';
import checkoutRoutes from './routes/checkout';
import adminRoutes from './routes/admin';
import blogRoutes from './routes/blog';

// Initialize env vars
dotenv.config();

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  },
});

async function bootstrap() {
  try {
    // 1. Core Security Plugins & Rate Limiting
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Turn off CSP for iframe & dev compatibility
    });
    
    await fastify.register(cors, {
      origin: true, // Allow dynamic cors for easy integration
      credentials: true,
    });

    await fastify.register(rateLimit, {
      max: 120, // max 120 requests
      timeWindow: '1 minute', // per minute
      allowList: ['127.0.0.1'], // allow unlimited local loopback requests
    });

    // 2. Custom Plugins
    await fastify.register(dbPlugin);
    await fastify.register(authPlugin);

    // 3. Register Health Endpoint
    fastify.get('/health', async () => {
      return { status: 'OK', uptime: process.uptime(), timestamp: new Date() };
    });

    // Global Unhandled Exception & Diagnostic Error Logger
    fastify.setErrorHandler(async (error, request, reply) => {
      fastify.log.error(error);

      try {
        if (fastify.prisma) {
          await fastify.prisma.errorLog.create({
            data: {
              source: 'BACKEND_API',
              level: error.statusCode && error.statusCode < 500 ? 'WARN' : 'ERROR',
              message: error.message || 'Internal Server Error',
              stack: error.stack || null,
              path: request.raw.url || request.url,
              method: request.method,
              statusCode: error.statusCode || 500,
              userEmail: (request as any).user?.email || null,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            },
          });
        }
      } catch (logErr) {
        fastify.log.error(logErr);
      }

      const statusCode = error.statusCode || 500;
      reply.status(statusCode).send({
        error: statusCode === 500 ? 'Внутренняя ошибка сервера (зафиксировано в журнале ошибок)' : error.message,
      });
    });

    // 4. API Endpoints
    // Note: Caddy reverse proxy strips '/api' before proxying. Thus:
    // '/api/auth/login' reaches Fastify as '/auth/login'.
    await fastify.register(authRoutes, { prefix: '/auth' });
    await fastify.register(profileRoutes, { prefix: '/profiles' });
    await fastify.register(checkoutRoutes, { prefix: '/checkout' });
    await fastify.register(adminRoutes, { prefix: '/admin' });
    await fastify.register(blogRoutes, { prefix: '/blog' });

    // 5. Start Listening
    const port = Number(process.env.PORT) || 5010;
    const host = '0.0.0.0'; // Essential to bind within Docker containers

    await fastify.listen({ port, host });
    console.log(`🚀 Fastify REST API server is listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
export default fastify;
