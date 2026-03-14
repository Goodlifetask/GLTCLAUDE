import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (server: FastifyInstance) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      if (times > 10) return null; // stop retrying
      return Math.min(times * 50, 2000);
    },
  });

  redis.on('connect', () => logger.info('Connected to Redis'));
  redis.on('error',   (err) => logger.error({ err }, 'Redis error'));
  redis.on('close',   () => logger.warn('Redis connection closed'));

  server.decorate('redis', redis);

  server.addHook('onClose', async () => {
    await redis.quit();
    logger.info('Disconnected from Redis');
  });
});
