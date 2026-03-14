import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth';

export async function integrationsCalendarRoutes(server: FastifyInstance) {
  // GET /v1/integrations/calendar — list connected calendars
  server.get('/', { preHandler: authenticate }, async (request, reply) => {
    const integrations = await server.prisma.calendarIntegration.findMany({
      where: { user_id: request.user.sub, is_active: true },
      select: { id: true, provider: true, calendar_id: true, calendar_name: true, sync_enabled: true, last_synced_at: true },
    });

    return reply.send({ success: true, data: integrations });
  });

  // DELETE /v1/integrations/calendar/:id — disconnect calendar
  server.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await server.prisma.calendarIntegration.updateMany({
      where: { id, user_id: request.user.sub },
      data: { is_active: false },
    });

    return reply.send({ success: true });
  });

  // POST /v1/integrations/calendar/:id/sync — trigger manual sync
  server.post('/:id/sync', { preHandler: authenticate }, async (request, reply) => {
    // Placeholder: enqueue calendar sync job
    return reply.send({ success: true, data: { message: 'Sync job queued' } });
  });
}
