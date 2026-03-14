import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import fastifyMultipart from '@fastify/multipart';
import { prismaPlugin } from './prisma';
import { redisPlugin } from './redis';
import { env } from '../lib/env';

export async function registerPlugins(server: FastifyInstance) {
  // Security headers
  await server.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc:    ["'self'"],
        scriptSrc:     ["'self'"],
        styleSrc:      ["'self'", "'unsafe-inline'"],
        imgSrc:        ["'self'", 'data:', 'https:'],
        connectSrc:    ["'self'"],
        fontSrc:       ["'self'"],
        objectSrc:     ["'none'"],
        frameSrc:      ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  // CORS
  await server.register(fastifyCors, {
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  });

  // Cookies
  await server.register(fastifyCookie, {
    secret: env.JWT_SECRET,
    hook: 'onRequest',
  });

  // JWT
  await server.register(fastifyJwt, {
    secret: { private: env.JWT_SECRET, public: env.JWT_SECRET },
    sign: {
      algorithm:  'HS256',
      issuer:     env.JWT_ISSUER,
      audience:   env.JWT_AUDIENCE,
      expiresIn:  env.ACCESS_TOKEN_TTL,
    },
    verify: {
      issuer:   env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
  });

  // Rate limiting (global default)
  await server.register(fastifyRateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    redis: undefined, // will be set after Redis plugin registers
    keyGenerator: (request) => {
      return request.headers['x-forwarded-for'] as string
        || request.ip
        || 'unknown';
    },
    errorResponseBuilder: (_request, context) => ({
      error:   'RATE_LIMITED',
      message: 'Too many requests',
      code:    'RATE_LIMITED',
      retryAfter: Math.ceil(context.ttl / 1000),
    }),
  });

  // Sensible (adds reply.notFound(), reply.unauthorized(), etc.)
  await server.register(fastifySensible);

  // Multipart (file uploads)
  await server.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1,
    },
  });

  // Database
  await server.register(prismaPlugin);

  // Redis
  await server.register(redisPlugin);

  // Add request ID to every request
  server.addHook('onRequest', async (request) => {
    request.headers['x-request-id'] =
      request.headers['x-request-id'] || crypto.randomUUID();
  });
}
