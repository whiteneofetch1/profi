import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; role: 'CLIENT' | 'DEVELOPER' | 'ADMIN' };
    user: { id: string; email: string; role: 'CLIENT' | 'DEVELOPER' | 'ADMIN' };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Register fastify-cookie
  await fastify.register(fastifyCookie, {
    secret: process.env.JWT_SECRET || 'cookie_secret_fallback_9821734_fyxi',
  });

  // Register fastify-jwt
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'jwt_secret_fallback_2398412_fyxi',
    cookie: {
      cookieName: 'token',
      signed: false, // Set to true if you want signed cookies
    },
  });

  // Define authentication pre-handler
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Try to read from cookie or Authorization header
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized: Access token missing or invalid' });
    }
  };

  // Decorate fastify with helper
  fastify.decorate('authenticate', authenticate);
};

export default fp(authPlugin);
export { authPlugin };
