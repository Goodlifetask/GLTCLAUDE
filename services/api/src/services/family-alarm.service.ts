import { PrismaClient, FamilyAlarm } from '@prisma/client';
import { Queue } from 'bullmq';
import { canCreateFamilyAlarm, FAMILY_ALARM_FREE_LIMIT } from '@glt/shared';
import { logger } from '../lib/logger';

export const VOICE_LABELS = [
  'Dad', 'Mom', 'Wife', 'Husband', 'Son', 'Daughter',
  'Friend', 'Partner', 'Grandpa', 'Grandma', 'Other',
] as const;

export type VoiceLabel = typeof VOICE_LABELS[number];

interface CreateFamilyAlarmInput {
  userId:        string;
  title:         string;
  voiceLabel:    string;
  voiceFileUrl?: string;
  fireAt:        Date;
  repeatRule?:   string;
  notes?:        string;
  gradualVolume?: boolean;
}

interface UpdateFamilyAlarmInput {
  title?:        string;
  voiceLabel?:   string;
  voiceFileUrl?: string;
  fireAt?:       Date;
  repeatRule?:   string;
  notes?:        string;
  gradualVolume?: boolean;
  active?:       boolean;
}

export class FamilyAlarmService {
  constructor(
    private prisma: PrismaClient,
    private alarmQueue: Queue | null,
  ) {}

  async planStatus(userId: string) {
    const count = await this.prisma.familyAlarm.count({
      where: { userId, deletedAt: null },
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isPaid = user.plan !== 'free';
    return {
      count,
      limit: isPaid ? -1 : FAMILY_ALARM_FREE_LIMIT,
      canCreate: canCreateFamilyAlarm(user.plan as any, count),
      plan: user.plan,
    };
  }

  async create(input: CreateFamilyAlarmInput): Promise<FamilyAlarm> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: input.userId } });

    const activeCount = await this.prisma.familyAlarm.count({
      where: { userId: input.userId, deletedAt: null },
    });

    if (!canCreateFamilyAlarm(user.plan as any, activeCount)) {
      const err = new Error(
        `Free plan allows up to ${FAMILY_ALARM_FREE_LIMIT} family alarms. Upgrade to Pro for unlimited.`,
      ) as Error & { statusCode: number; code: string };
      err.statusCode = 402;
      err.code = 'FAMILY_ALARM_LIMIT_REACHED';
      throw err;
    }

    const alarm = await this.prisma.familyAlarm.create({
      data: {
        userId:        input.userId,
        title:         input.title,
        voiceLabel:    input.voiceLabel,
        voiceFileUrl:  input.voiceFileUrl ?? null,
        fireAt:        input.fireAt,
        repeatRule:    input.repeatRule ?? null,
        notes:         input.notes ?? null,
        gradualVolume: input.gradualVolume ?? true,
        active:        true,
      },
    });

    await this.scheduleAlarm(alarm);
    return alarm;
  }

  async list(userId: string, page = 1, limit = 50): Promise<{ data: FamilyAlarm[]; total: number }> {
    const where = { userId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.familyAlarm.findMany({
        where,
        orderBy: { fireAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.familyAlarm.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string, userId: string): Promise<FamilyAlarm> {
    const alarm = await this.prisma.familyAlarm.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!alarm) {
      const err = new Error('Family alarm not found') as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }
    return alarm;
  }

  async update(id: string, userId: string, input: UpdateFamilyAlarmInput): Promise<FamilyAlarm> {
    await this.findById(id, userId); // ownership check

    const alarm = await this.prisma.familyAlarm.update({
      where: { id },
      data: {
        ...(input.title         !== undefined && { title: input.title }),
        ...(input.voiceLabel    !== undefined && { voiceLabel: input.voiceLabel }),
        ...(input.voiceFileUrl  !== undefined && { voiceFileUrl: input.voiceFileUrl }),
        ...(input.fireAt        !== undefined && { fireAt: input.fireAt }),
        ...(input.repeatRule    !== undefined && { repeatRule: input.repeatRule }),
        ...(input.notes         !== undefined && { notes: input.notes }),
        ...(input.gradualVolume !== undefined && { gradualVolume: input.gradualVolume }),
        ...(input.active        !== undefined && { active: input.active }),
      },
    });

    // Reschedule if fire time changed
    if (input.fireAt !== undefined) {
      await this.scheduleAlarm(alarm);
    }

    return alarm;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId); // ownership check
    await this.prisma.familyAlarm.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  private async scheduleAlarm(alarm: FamilyAlarm): Promise<void> {
    if (!this.alarmQueue) {
      logger.warn({ alarmId: alarm.id }, 'Family alarm queue unavailable — skipping schedule');
      return;
    }

    const delay = alarm.fireAt.getTime() - Date.now();
    if (delay <= 0) return; // already past

    await this.alarmQueue.add(
      'fire-family-alarm',
      {
        familyAlarmId: alarm.id,
        userId:        alarm.userId,
        title:         alarm.title,
        voiceLabel:    alarm.voiceLabel,
        voiceFileUrl:  alarm.voiceFileUrl,
        gradualVolume: alarm.gradualVolume,
        repeatRule:    alarm.repeatRule,
      },
      {
        delay,
        jobId:    `family-alarm-${alarm.id}`,
        attempts: 3,
        backoff:  { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 50 },
      },
    );
  }
}
