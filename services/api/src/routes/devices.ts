import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';

const RegisterDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  device_name: z.string().max(100).optional(),
});

export async function devicesRoutes(server: FastifyInstance) {
  // POST /v1/devices — register push token
  server.post('/', { preHandler: authenticate }, async (request, reply) => {
    const body = RegisterDeviceSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.message } });
    }

    const device = await server.prisma.pushDeviceToken.upsert({
      where: { token: body.data.token },
      create: { ...body.data, user_id: request.user.sub, is_active: true },
      update: { user_id: request.user.sub, is_active: true, updated_at: new Date() },
    });

    return reply.status(201).send({ success: true, data: device });
  });

  // DELETE /v1/devices/:token — deregister push token
  server.delete('/:token', { preHandler: authenticate }, async (request, reply) => {
    const { token } = request.params as { token: string };

    await server.prisma.pushDeviceToken.updateMany({
      where: { token, user_id: request.user.sub },
      data: { is_active: false },
    });

    return reply.send({ success: true });
  });
}
