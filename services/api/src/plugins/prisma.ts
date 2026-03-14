import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(async (server: FastifyInstance) => {
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query'  },
      { emit: 'event', level: 'error'  },
      { emit: 'event', level: 'warn'   },
    ],
  });

  if (process.env['NODE_ENV'] === 'development') {
    prisma.$on('query', (e) => {
      logger.debug({ query: e.query, duration: e.duration }, 'DB Query');
    });
  }

  prisma.$on('error', (e) => {
    logger.error({ message: e.message }, 'DB Error');
  });

  await prisma.$connect();
  logger.info('Connected to PostgreSQL via Prisma');

  server.decorate('prisma', prisma);

  server.addHook('onClose', async () => {
    await prisma.$disconnect();
    logger.info('Disconnected from PostgreSQL');
  });
});
