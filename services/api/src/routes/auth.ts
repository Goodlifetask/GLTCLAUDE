import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { authenticate } from '../middleware/auth';

const registerSchema = z.object({
  email:    z.string().email().max(255),
  password: z.string().min(8).max(128),
  name:     z.string().min(1).max(100),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const magicLinkSchema = z.object({
  email: z.string().email(),
});

function serializeUser(user: Record<string, unknown>) {
  return {
    id:          user['id'],
    email:       user['email'],
    name:        user['name'],
    avatar_url:  user['avatarUrl'] ?? null,
    plan:        user['plan'],
    locale:      user['locale'],
    timezone:    user['timezone'],
    theme:       user['theme'],
    created_at:  user['createdAt'],
  };
}

export async function authRoutes(server: FastifyInstance) {
  const authService = new AuthService(server.prisma, server);

  // POST /v1/auth/register
  server.post(
    '/register',
    {
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = registerSchema.parse(request.body);
      const { user, tokens } = await authService.register(input);

      return reply.status(201).send({
        data: {
          user:   serializeUser(user as any),
          tokens: {
            access_token:  tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expires_in:    tokens.expiresIn,
          },
        },
      });
    },
  );

  // POST /v1/auth/login
  server.post(
    '/login',
    {
      config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = loginSchema.parse(request.body);
      const { user, tokens } = await authService.login(input);

      // Set HttpOnly cookie for web clients
      reply.setCookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure:   process.env['NODE_ENV'] !== 'development',
        sameSite: 'strict',
        path:     '/',
        maxAge:   2592000, // 30 days
      });

      return reply.send({
        data: {
          user:   serializeUser(user as any),
          tokens: {
            access_token:  tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expires_in:    tokens.expiresIn,
          },
        },
      });
    },
  );

  // POST /v1/auth/refresh
  server.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    // Try cookie first (web), then body (mobile)
    const rawToken =
      request.cookies['refresh_token'] ||
      (refreshSchema.safeParse(request.body).data?.refresh_token);

    if (!rawToken) {
      return reply.status(401).send({
        error:   'UNAUTHORIZED',
        message: 'Refresh token required',
        code:    'UNAUTHORIZED',
      });
    }

    const tokens = await authService.refreshToken(rawToken);

    // Rotate cookie
    reply.setCookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure:   process.env['NODE_ENV'] !== 'development',
      sameSite: 'strict',
      path:     '/',
      maxAge:   2592000,
    });

    return reply.send({
      data: {
        access_token:  tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in:    tokens.expiresIn,
      },
    });
  });

  // POST /v1/auth/magic-link
  server.post('/magic-link', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = magicLinkSchema.parse(request.body);
    await authService.sendMagicLink(email);
    return reply.status(202).send({ data: { message: 'If this email is registered, a magic link has been sent.' } });
  });

  // GET /v1/auth/verify?token=...
  server.get('/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = (request.query as Record<string, string>)['token'];
    if (!token) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Token required', code: 'VALIDATION_ERROR' });

    const { user, tokens } = await authService.verifyMagicLink(token);

    reply.setCookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure:   process.env['NODE_ENV'] !== 'development',
      sameSite: 'strict',
      path:     '/',
      maxAge:   2592000,
    });

    return reply.send({
      data: {
        user:   serializeUser(user as any),
        tokens: {
          access_token:  tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in:    tokens.expiresIn,
        },
      },
    });
  });

  // POST /v1/auth/forgot-password
  server.post(
    '/forgot-password',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = z.object({ email: z.string().email() }).parse(request.body);
      await authService.forgotPassword(email);
      return reply.status(202).send({
        data: { message: 'If this email is registered, a password reset link has been sent.' },
      });
    },
  );

  // POST /v1/auth/reset-password
  server.post(
    '/reset-password',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        token:    z.string().min(1),
        password: z.string().min(8).max(128),
      });
      const { token, password } = schema.parse(request.body);
      await authService.resetPassword(token, password);
      return reply.send({ data: { message: 'Password reset successfully. Please log in.' } });
    },
  );

  // POST /v1/auth/logout
  server.post(
    '/logout',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawToken =
        request.cookies['refresh_token'] ||
        (refreshSchema.safeParse(request.body).data?.refresh_token);

      if (rawToken) {
        await authService.logout(rawToken);
      }

      reply.clearCookie('refresh_token', { path: '/' });
      return reply.status(204).send();
    },
  );
}
