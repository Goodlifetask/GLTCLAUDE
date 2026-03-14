import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  timezone: z.string().optional(),
  theme: z.enum(['warm_corporate', 'blue_spectrum', 'india', 'usa']).optional(),
  notification_preferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }).optional(),
});

export async function usersRoutes(server: FastifyInstance) {
  // GET /v1/users/me
  server.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await server.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        plan: true,
        timezone: true,
        theme: true,
        email_verified: true,
        notification_preferences: true,
        created_at: true,
      },
    });

    if (!user) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    return reply.send({ success: true, data: user });
  });

  // PATCH /v1/users/me
  server.patch('/me', { preHandler: authenticate }, async (request, reply) => {
    const body = UpdateProfileSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.message } });
    }

    const user = await server.prisma.user.update({
      where: { id: request.user.sub },
      data: body.data,
      select: { id: true, email: true, name: true, avatar_url: true, plan: true, timezone: true, theme: true },
    });

    return reply.send({ success: true, data: user });
  });

  // GET /v1/users/me/stats
  server.get('/me/stats', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.sub;

    const [total, completed, overdue, upcoming] = await Promise.all([
      server.prisma.reminder.count({ where: { user_id: userId, deleted_at: null } }),
      server.prisma.reminder.count({ where: { user_id: userId, status: 'completed', deleted_at: null } }),
      server.prisma.reminder.count({
        where: { user_id: userId, status: 'pending', fire_at: { lt: new Date() }, deleted_at: null },
      }),
      server.prisma.reminder.count({
        where: { user_id: userId, status: 'pending', fire_at: { gte: new Date() }, deleted_at: null },
      }),
    ]);

    return reply.send({ success: true, data: { total, completed, overdue, upcoming } });
  });

  // DELETE /v1/users/me
  server.delete('/me', { preHandler: authenticate }, async (request, reply) => {
    await server.prisma.user.update({
      where: { id: request.user.sub },
      data: { deleted_at: new Date(), email: `deleted_${request.user.sub}@deleted.invalid` },
    });
    reply.clearCookie('refresh_token');
    return reply.send({ success: true });
  });
}
