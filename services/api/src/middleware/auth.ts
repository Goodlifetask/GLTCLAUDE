import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTPayload } from '@glt/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

/**
 * Authentication middleware — verifies JWT and attaches user to request.
 * Use as a preHandler hook on protected routes.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
    request.user = request.user as JWTPayload;
  } catch (err) {
    reply.status(401).send({
      error:   'UNAUTHORIZED',
      message: 'Invalid or expired access token',
      code:    'UNAUTHORIZED',
    });
  }
}

/**
 * Optional authentication — attaches user if token present, otherwise continues.
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      await request.jwtVerify();
    }
  } catch {
    // ignore — optional auth
  }
}
