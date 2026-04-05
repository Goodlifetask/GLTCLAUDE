/**
 * Family Alarm Worker
 * Processes jobs from the BullMQ `family-alarms` queue.
 * Sends Web Push notifications with voice file payload when an alarm fires.
 */
import { Worker, Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import webpush from 'web-push';
import { PrismaClient, Platform } from '@prisma/client';
import { logger } from '../../api/src/lib/logger';
import { env } from '../../api/src/lib/env';
import { parseRRule, nextOccurrence } from './lib/rrule-helper';

// ─── Init Web Push ────────────────────────────────────────────────────────────
webpush.setVapidDetails(
  `mailto:${env.VAPID_SUBJECT}`,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);

const prisma = new PrismaClient();
const redis  = new Redis(env.REDIS_URL);

const alarmQueue = new Queue('family-alarms', {
  connection: new Redis(env.REDIS_URL),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

// ─── Job data shape ───────────────────────────────────────────────────────────
interface FamilyAlarmJobData {
  familyAlarmId: string;
  userId:        string;
  title:         string;
  voiceLabel:    string;
  voiceFileUrl:  string | null;
  gradualVolume: boolean;
  repeatRule:    string | null;
}

// ─── Worker ───────────────────────────────────────────────────────────────────
const worker = new Worker<FamilyAlarmJobData>(
  'family-alarms',
  async (job: Job<FamilyAlarmJobData>) => {
    const { familyAlarmId, userId, title, voiceLabel, voiceFileUrl, gradualVolume, repeatRule } = job.data;
    logger.info({ jobId: job.id, familyAlarmId, userId }, 'Processing family alarm');

    // Verify alarm is still active
    const alarm = await prisma.familyAlarm.findFirst({
      where: { id: familyAlarmId, userId, active: true, deletedAt: null },
    });

    if (!alarm) {
      logger.info({ familyAlarmId }, 'Family alarm inactive or deleted — skipping');
      return;
    }

    // Get web push subscriptions for the user
    const tokens = await prisma.pushDeviceToken.findMany({
      where: { userId, isActive: true, platform: Platform.web },
    });

    const notificationPayload = JSON.stringify({
      title:   voiceLabel,
      body:    title,
      icon:    '/icons/notification-icon.png',
      badge:   '/icons/badge-icon.png',
      data: {
        familyAlarmId,
        voiceFileUrl,
        gradualVolume,
        type: 'family-alarm',
      },
      actions: [
        { action: 'snooze', title: 'Snooze 10m' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });

    for (const token of tokens) {
      try {
        const sub = JSON.parse(token.token);
        await webpush.sendNotification(sub, notificationPayload);
        logger.info({ familyAlarmId, tokenId: token.id }, 'Family alarm web push sent');
      } catch (err: any) {
        const msg = err?.message ?? 'Unknown error';
        if (msg.includes('410') || msg.includes('404')) {
          await prisma.pushDeviceToken.update({
            where: { id: token.id },
            data:  { isActive: false },
          });
        }
        logger.error({ familyAlarmId, tokenId: token.id, err }, 'Family alarm web push failed');
      }
    }

    // Schedule next occurrence if repeat rule is set
    if (repeatRule) {
      const next = nextOccurrence(repeatRule, alarm.fireAt);
      if (next) {
        const delay = next.getTime() - Date.now();
        if (delay > 0) {
          await alarmQueue.add(
            'fire-family-alarm',
            { ...job.data },
            {
              delay,
              jobId:    `family-alarm-${familyAlarmId}`,
              attempts: 3,
              backoff:  { type: 'exponential', delay: 5000 },
              removeOnComplete: { count: 100 },
              removeOnFail:     { count: 50 },
            },
          );
          await prisma.familyAlarm.update({
            where: { id: familyAlarmId },
            data:  { fireAt: next },
          });
          logger.info({ familyAlarmId, next }, 'Family alarm rescheduled');
        }
      }
    }
  },
  {
    connection: redis,
    concurrency: 20,
  },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Family alarm job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Family alarm job failed');
});

process.on('SIGTERM', async () => {
  await worker.close();
  await alarmQueue.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

logger.info('Family alarm worker started');
