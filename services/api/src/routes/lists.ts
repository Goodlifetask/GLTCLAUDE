import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';

const CreateListSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(2).optional(),
  is_shared: z.boolean().optional(),
});

export async function listsRoutes(server: FastifyInstance) {
  // GET /v1/lists
  server.get('/', { preHandler: authenticate }, async (request, reply) => {
    const lists = await server.prisma.reminderList.findMany({
      where: { user_id: request.user.sub, deleted_at: null },
      orderBy: { created_at: 'asc' },
      include: { _count: { select: { reminders: { where: { deleted_at: null } } } } },
    });

    return reply.send({ success: true, data: lists });
  });

  // POST /v1/lists
  server.post('/', { preHandler: authenticate }, async (request, reply) => {
    const body = CreateListSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.message } });
    }

    const list = await server.prisma.reminderList.create({
      data: { ...body.data, user_id: request.user.sub },
    });

    return reply.status(201).send({ success: true, data: list });
  });

  // PATCH /v1/lists/:id
  server.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CreateListSchema.partial().safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.message } });
    }

    const existing = await server.prisma.reminderList.findFirst({ where: { id, user_id: request.user.sub, deleted_at: null } });
    if (!existing) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'List not found' } });
    if (existing.is_system) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot modify system list' } });

    const list = await server.prisma.reminderList.update({ where: { id }, data: body.data });
    return reply.send({ success: true, data: list });
  });

  // DELETE /v1/lists/:id
  server.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await server.prisma.reminderList.findFirst({ where: { id, user_id: request.user.sub, deleted_at: null } });
    if (!existing) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'List not found' } });
    if (existing.is_system) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete system list' } });

    await server.prisma.reminderList.update({ where: { id }, data: { deleted_at: new Date() } });
    return reply.send({ success: true });
  });
}
