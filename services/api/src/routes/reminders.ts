import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { ReminderService } from '../services/reminder.service';
import { authenticate } from '../middleware/auth';
import { env } from '../lib/env';

const createReminderSchema = z.object({
  type:      z.enum(['call', 'task', 'email', 'location', 'event']),
  title:     z.string().min(1).max(255),
  notes:     z.string().max(5000).optional(),
  fire_at:   z.string().datetime(),
  list_id:   z.string().uuid().optional(),
  priority:  z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  recurrence: z.object({
    frequency:       z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
    interval:        z.number().int().min(1).default(1),
    days_of_week:    z.array(z.number().int().min(0).max(6)).optional(),
    day_of_month:    z.number().int().min(1).max(31).optional(),
    month_of_year:   z.number().int().min(1).max(12).optional(),
    end_date:        z.string().date().optional(),
    max_occurrences: z.number().int().min(1).optional(),
  }).optional(),
  contact_id:  z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  metadata:    z.record(z.unknown()).optional(),
  share_scope: z.enum(['private', 'family', 'team', 'specific']).default('private'),
  assignee_id: z.string().uuid().optional(),
  project_id:  z.string().uuid().optional(),
  category:    z.string().max(50).optional(),
});

const updateReminderSchema = z.object({
  title:       z.string().min(1).max(255).optional(),
  notes:       z.string().max(5000).optional(),
  list_id:     z.string().uuid().optional(),
  priority:    z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  fire_at:     z.string().datetime().optional(),
  metadata:    z.record(z.unknown()).optional(),
  share_scope: z.enum(['private', 'family', 'team', 'specific']).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  project_id:  z.string().uuid().nullable().optional(),
  category:    z.string().max(50).nullable().optional(),
});

const snoozeSchema = z.object({
  duration_minutes: z.number().int().refine(
    (v) => [5, 10, 15, 30, 60, 1440].includes(v),
    { message: 'Must be one of: 5, 10, 15, 30, 60, 1440' }
  ),
});

const listQuerySchema = z.object({
  status:   z.enum(['pending', 'completed', 'snoozed']).optional(),
  type:     z.enum(['call', 'task', 'email', 'location', 'event']).optional(),
  list_id:  z.string().uuid().optional(),
  from:     z.string().datetime().optional(),
  to:       z.string().datetime().optional(),
  q:        z.string().max(100).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  sort:     z.enum(['fireAt', 'createdAt', 'priority']).default('fireAt'),
  order:    z.enum(['asc', 'desc']).default('asc'),
});

export async function remindersRoutes(server: FastifyInstance) {
  let notificationQueue: Queue | null = null;
  try {
    notificationQueue = new Queue('notifications', {
      connection: new Redis(env.REDIS_URL),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });
    // Verify Redis is compatible (BullMQ requires Redis >= 5)
    await notificationQueue.waitUntilReady();
  } catch (err: any) {
    server.log.warn(`Notification queue disabled: ${err?.message ?? err} — reminders will save but push notifications won't fire`);
    notificationQueue = null;
  }

  const reminderService = new ReminderService(server.prisma, notificationQueue);

  // GET /v1/reminders
  server.get(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listQuerySchema.parse(request.query);
      const result = await reminderService.list({
        userId:  request.user.sub,
        status:  query.status,
        type:    query.type,
        listId:  query.list_id,
        from:    query.from ? new Date(query.from) : undefined,
        to:      query.to   ? new Date(query.to)   : undefined,
        q:       query.q,
        page:    query.page,
        limit:   query.limit,
        sort:    query.sort,
        order:   query.order,
      });
      return reply.send(result);
    },
  );

  // POST /v1/reminders
  server.post(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = createReminderSchema.parse(request.body);
      const reminder = await reminderService.create({
        userId:     request.user.sub,
        type:       input.type,
        title:      input.title,
        notes:      input.notes,
        fireAt:     new Date(input.fire_at),
        listId:     input.list_id,
        priority:   input.priority,
        contactId:  input.contact_id,
        locationId: input.location_id,
        metadata:   input.metadata,
        shareScope: input.share_scope,
        assigneeId: input.assignee_id,
        category:   input.category,
        projectId:  input.project_id,
        recurrence: input.recurrence
          ? {
              frequency:      input.recurrence.frequency,
              interval:       input.recurrence.interval,
              daysOfWeek:     input.recurrence.days_of_week,
              dayOfMonth:     input.recurrence.day_of_month,
              monthOfYear:    input.recurrence.month_of_year,
              endDate:        input.recurrence.end_date ? new Date(input.recurrence.end_date) : undefined,
              maxOccurrences: input.recurrence.max_occurrences,
            }
          : undefined,
      });
      return reply.status(201).send({ data: reminder });
    },
  );

  // GET /v1/reminders/:id
  server.get(
    '/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const reminder = await reminderService.findById(id, request.user.sub);
      return reply.send({ data: reminder });
    },
  );

  // PATCH /v1/reminders/:id
  server.patch(
    '/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const input  = updateReminderSchema.parse(request.body);
      const reminder = await reminderService.update(id, request.user.sub, {
        title:      input.title,
        notes:      input.notes,
        listId:     input.list_id,
        priority:   input.priority,
        fireAt:     input.fire_at ? new Date(input.fire_at) : undefined,
        metadata:   input.metadata,
        shareScope: input.share_scope,
        assigneeId: input.assignee_id ?? undefined,
        category:   input.category ?? undefined,
        projectId:  input.project_id ?? undefined,
      });
      return reply.send({ data: reminder });
    },
  );

  // DELETE /v1/reminders/:id
  server.delete(
    '/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      await reminderService.softDelete(id, request.user.sub);
      return reply.status(204).send();
    },
  );

  // POST /v1/reminders/:id/complete
  server.post(
    '/:id/complete',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const reminder = await reminderService.complete(id, request.user.sub);
      return reply.send({ data: reminder });
    },
  );

  // POST /v1/reminders/:id/snooze
  server.post(
    '/:id/snooze',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id }  = request.params as { id: string };
      const { duration_minutes } = snoozeSchema.parse(request.body);
      const reminder = await reminderService.snooze(id, request.user.sub, duration_minutes);
      return reply.send({ data: reminder });
    },
  );

  // POST /v1/reminders/:id/duplicate
  server.post(
    '/:id/duplicate',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const reminder = await reminderService.duplicate(id, request.user.sub);
      return reply.status(201).send({ data: reminder });
    },
  );
}
