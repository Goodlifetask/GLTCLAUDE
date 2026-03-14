import { PrismaClient, Reminder, ReminderStatus } from '@prisma/client';
import { canCreateReminder } from '@glt/shared';
import { buildRRuleString, getNextFireTime } from '@glt/shared';
import { Queue } from 'bullmq';
import { logger } from '../lib/logger';

interface CreateReminderInput {
  userId:      string;
  listId?:     string;
  type:        string;
  title:       string;
  notes?:      string;
  priority?:   string;
  fireAt:      Date;
  recurrence?: {
    frequency:       string;
    interval:        number;
    daysOfWeek?:     number[];
    dayOfMonth?:     number;
    monthOfYear?:    number;
    endDate?:        Date;
    maxOccurrences?: number;
  };
  contactId?:  string;
  locationId?: string;
  metadata?:   Record<string, unknown>;
  workspaceId?: string;
}

interface UpdateReminderInput {
  listId?:    string;
  title?:     string;
  notes?:     string;
  priority?:  string;
  fireAt?:    Date;
  status?:    string;
  metadata?:  Record<string, unknown>;
}

interface ListRemindersInput {
  userId:     string;
  status?:    string;
  type?:      string;
  listId?:    string;
  from?:      Date;
  to?:        Date;
  q?:         string;
  page?:      number;
  limit?:     number;
  sort?:      string;
  order?:     'asc' | 'desc';
}

export class ReminderService {
  constructor(
    private prisma: PrismaClient,
    private notificationQueue: Queue,
  ) {}

  async create(input: CreateReminderInput): Promise<Reminder> {
    // Enforce plan limits
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: input.userId },
    });

    const activeCount = await this.prisma.reminder.count({
      where: { userId: input.userId, deletedAt: null },
    });

    if (!canCreateReminder(user.plan as any, activeCount)) {
      const err = new Error('Free plan reminder limit reached. Upgrade to Pro for unlimited reminders.') as Error & { statusCode: number; code: string };
      err.statusCode = 402;
      err.code = 'PLAN_LIMIT_REACHED';
      throw err;
    }

    // Build recurrence rule if provided
    let recurrenceId: string | undefined;
    if (input.recurrence) {
      const freq = input.recurrence;
      const rruleString = buildRRuleString({
        frequency:       freq.frequency as any,
        interval:        freq.interval ?? 1,
        daysOfWeek:      freq.daysOfWeek ?? [],
        dayOfMonth:      freq.dayOfMonth ?? null,
        monthOfYear:     freq.monthOfYear ?? null,
        endDate:         freq.endDate ?? null,
        maxOccurrences:  freq.maxOccurrences ?? null,
      });

      const rule = await this.prisma.recurrenceRule.create({
        data: {
          userId:         input.userId,
          frequency:      freq.frequency as any,
          interval:       freq.interval ?? 1,
          daysOfWeek:     freq.daysOfWeek ?? [],
          dayOfMonth:     freq.dayOfMonth ?? null,
          monthOfYear:    freq.monthOfYear ?? null,
          endDate:        freq.endDate ?? null,
          maxOccurrences: freq.maxOccurrences ?? null,
          rruleString,
        },
      });
      recurrenceId = rule.id;
    }

    const reminder = await this.prisma.reminder.create({
      data: {
        userId:      input.userId,
        listId:      input.listId ?? null,
        recurrenceId: recurrenceId ?? null,
        contactId:   input.contactId ?? null,
        locationId:  input.locationId ?? null,
        type:        input.type as any,
        title:       input.title,
        notes:       input.notes ?? null,
        priority:    (input.priority as any) ?? 'medium',
        status:      'pending',
        fireAt:      input.fireAt,
        metadata:    input.metadata ?? {},
        workspaceId: input.workspaceId ?? null,
      },
      include: {
        list:       true,
        recurrence: true,
        contact:    true,
        location:   true,
      },
    });

    // Schedule notification
    await this.scheduleNotification(reminder);

    logger.info({ reminderId: reminder.id, userId: input.userId }, 'Reminder created');
    return reminder;
  }

  async list(input: ListRemindersInput) {
    const page  = input.page  ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const skip  = (page - 1) * limit;

    const where: Record<string, unknown> = {
      userId:    input.userId,
      deletedAt: null,
    };

    if (input.status) where['status'] = input.status;
    if (input.type)   where['type']   = input.type;
    if (input.listId) where['listId'] = input.listId;

    if (input.from || input.to) {
      where['fireAt'] = {};
      if (input.from) (where['fireAt'] as any)['gte'] = input.from;
      if (input.to)   (where['fireAt'] as any)['lte'] = input.to;
    }

    if (input.q) {
      where['OR'] = [
        { title: { contains: input.q, mode: 'insensitive' } },
        { notes: { contains: input.q, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, string> = {};
    orderBy[input.sort ?? 'fireAt'] = input.order ?? 'asc';

    const [data, total] = await Promise.all([
      this.prisma.reminder.findMany({
        where: where as any,
        orderBy: orderBy as any,
        skip,
        take: limit,
        include: {
          list:       true,
          recurrence: true,
          contact:    true,
          location:   true,
        },
      }),
      this.prisma.reminder.count({ where: where as any }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string, userId: string): Promise<Reminder> {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, userId, deletedAt: null },
      include: { list: true, recurrence: true, contact: true, location: true },
    });

    if (!reminder) {
      const err = new Error('Reminder not found') as Error & { statusCode: number; code: string };
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return reminder;
  }

  async update(id: string, userId: string, input: UpdateReminderInput): Promise<Reminder> {
    await this.findById(id, userId); // ensure exists and belongs to user

    const updated = await this.prisma.reminder.update({
      where: { id },
      data: {
        ...(input.title    && { title:    input.title }),
        ...(input.notes    && { notes:    input.notes }),
        ...(input.listId   && { listId:   input.listId }),
        ...(input.priority && { priority: input.priority as any }),
        ...(input.status   && { status:   input.status as any }),
        ...(input.fireAt   && { fireAt:   input.fireAt }),
        ...(input.metadata && { metadata: input.metadata }),
      },
      include: { list: true, recurrence: true, contact: true, location: true },
    });

    // Reschedule notification if fireAt changed
    if (input.fireAt) {
      await this.scheduleNotification(updated);
    }

    return updated;
  }

  async complete(id: string, userId: string): Promise<Reminder> {
    await this.findById(id, userId);

    const updated = await this.prisma.reminder.update({
      where: { id },
      data: {
        status:      'completed',
        completedAt: new Date(),
      },
      include: { list: true, recurrence: true, contact: true, location: true },
    });

    // If recurring, create next occurrence
    if (updated.recurrenceId && updated.recurrence) {
      const nextFireAt = getNextFireTime(updated.fireAt, updated.recurrence as any);
      if (nextFireAt) {
        await this.create({
          userId:       userId,
          listId:       updated.listId ?? undefined,
          type:         updated.type,
          title:        updated.title,
          notes:        updated.notes ?? undefined,
          priority:     updated.priority,
          fireAt:       nextFireAt,
          recurrence:   updated.recurrence as any,
          contactId:    updated.contactId ?? undefined,
          locationId:   updated.locationId ?? undefined,
          metadata:     updated.metadata as any,
        });
      }
    }

    logger.info({ reminderId: id, userId }, 'Reminder completed');
    return updated;
  }

  async snooze(id: string, userId: string, durationMinutes: number): Promise<Reminder> {
    await this.findById(id, userId);
    const snoozedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    const updated = await this.prisma.reminder.update({
      where: { id },
      data: {
        status:      'snoozed',
        snoozedUntil,
        fireAt:      snoozedUntil,
      },
      include: { list: true, recurrence: true, contact: true, location: true },
    });

    await this.scheduleNotification(updated);
    logger.info({ reminderId: id, userId, durationMinutes }, 'Reminder snoozed');
    return updated;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);
    await this.prisma.reminder.update({
      where: { id },
      data:  { deletedAt: new Date(), status: 'deleted' },
    });
    logger.info({ reminderId: id, userId }, 'Reminder deleted');
  }

  async duplicate(id: string, userId: string): Promise<Reminder> {
    const original = await this.findById(id, userId);
    const fireAt   = new Date(original.fireAt.getTime() + 3600000); // +1 hour

    return this.create({
      userId,
      listId:    original.listId ?? undefined,
      type:      original.type,
      title:     `${original.title} (copy)`,
      notes:     original.notes ?? undefined,
      priority:  original.priority,
      fireAt,
      metadata:  original.metadata as any,
    });
  }

  private async scheduleNotification(reminder: Reminder): Promise<void> {
    const delay = reminder.fireAt.getTime() - Date.now();
    if (delay <= 0) return; // already past

    await this.notificationQueue.add(
      'send-notification',
      {
        reminderId: reminder.id,
        userId:     reminder.userId,
        type:       reminder.type,
        title:      reminder.title,
      },
      {
        delay,
        jobId:    `notif-${reminder.id}`, // deduplication key
        attempts: 5,
        backoff:  { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 50 },
      },
    );
  }
}
