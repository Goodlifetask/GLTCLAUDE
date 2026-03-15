import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { AuthService } from '../services/auth.service';

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  locale: z.string().max(20).optional(),
  timezone: z.string().optional(),
  theme: z.enum(['warm_corporate', 'blue_spectrum', 'india', 'usa']).optional(),
  notificationPreferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }).optional(),
  persona: z.enum(['student', 'teacher', 'nurse', 'doctor', 'engineer', 'carpenter', 'chef', 'developer', 'manager', 'entrepreneur', 'parent', 'retiree', 'other']).optional(),
  occupation:      z.string().max(100).optional(),
  profileCategory: z.string().max(60).optional(),
  profileSubType:  z.string().max(100).optional(),
  taskPreferences: z.array(z.string()).optional(),
});

export async function usersRoutes(server: FastifyInstance) {
  const authService = new AuthService(server.prisma, server);
  // GET /v1/users/me
  server.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await server.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
        locale: true,
        timezone: true,
        theme: true,
        persona:         true,
        occupation:      true,
        profileCategory: true,
        profileSubType:  true,
        taskPreferences: true,
        createdAt:       true,
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
      select: { id: true, email: true, name: true, avatarUrl: true, plan: true, locale: true, timezone: true, theme: true, persona: true, occupation: true, profileCategory: true, profileSubType: true, taskPreferences: true },
    });

    return reply.send({ success: true, data: user });
  });

  // GET /v1/users/me/stats
  server.get('/me/stats', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.sub;

    const [total, completed, overdue, upcoming] = await Promise.all([
      server.prisma.reminder.count({ where: { userId, deletedAt: null } }),
      server.prisma.reminder.count({ where: { userId, status: 'completed', deletedAt: null } }),
      server.prisma.reminder.count({
        where: { userId, status: 'pending', fireAt: { lt: new Date() }, deletedAt: null },
      }),
      server.prisma.reminder.count({
        where: { userId, status: 'pending', fireAt: { gte: new Date() }, deletedAt: null },
      }),
    ]);

    return reply.send({ success: true, data: { total, completed, overdue, upcoming } });
  });

  // PATCH /v1/users/me/password
  server.patch('/me/password', { preHandler: authenticate }, async (request, reply) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8).max(128),
    });
    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.message } });
    }
    await authService.changePassword(request.user.sub, body.data.currentPassword, body.data.newPassword);
    return reply.send({ success: true, data: { message: 'Password updated successfully.' } });
  });

  // DELETE /v1/users/me
  server.delete('/me', { preHandler: authenticate }, async (request, reply) => {
    await server.prisma.user.update({
      where: { id: request.user.sub },
      data: { deletedAt: new Date(), email: `deleted_${request.user.sub}@deleted.invalid` },
    });
    reply.clearCookie('refresh_token');
    return reply.send({ success: true });
  });
}
