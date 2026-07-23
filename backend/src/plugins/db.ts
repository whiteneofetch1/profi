import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

// Extend FastifyInstance type to include our PrismaClient
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  // Connect on start
  await prisma.$connect();

  // Decorate the fastify instance
  fastify.decorate('prisma', prisma);

  // Close connection on close
  fastify.addHook('onClose', async (server) => {
    await server.prisma.$disconnect();
  });
};

export default fp(prismaPlugin);
