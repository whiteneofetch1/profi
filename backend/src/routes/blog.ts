import { FastifyInstance, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';

export default async function blogRoutes(fastify: FastifyInstance) {
  
  // 1. GET ALL PUBLISHED BLOG POSTS
  fastify.get(
    '/',
    async (request, reply) => {
      try {
        const posts = await fastify.prisma.blogPost.findMany({
          where: {
            publishDate: {
              lte: new Date() // Only show articles whose publish date has passed
            }
          },
          orderBy: {
            publishDate: 'desc'
          }
        });
        return posts;
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Внутренняя ошибка сервера при получении статей.' });
      }
    }
  );

  // 2. GET SINGLE BLOG POST BY SLUG
  fastify.get(
    '/:slug',
    {
      schema: {
        params: Type.Object({
          slug: Type.String()
        })
      }
    },
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply) => {
      try {
        const { slug } = request.params;
        
        const post = await fastify.prisma.blogPost.findUnique({
          where: {
            slug
          }
        });

        // Block access to scheduled posts whose publishDate is in the future
        if (!post || post.publishDate > new Date()) {
          return reply.status(404).send({ error: 'Статья не найдена или еще не опубликована по расписанию.' });
        }

        return post;
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Внутренняя ошибка сервера при загрузке статьи.' });
      }
    }
  );
}
