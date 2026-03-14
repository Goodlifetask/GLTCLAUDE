/**
 * Notification Worker
 * Processes push notification jobs from the BullMQ `notifications` queue.
 * Dispatches via FCM (Android), APNs (iOS), and Web Push (VAPID).
 */
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import * as admin from 'firebase-admin';
import apn from 'node-apn';
import webpush from 'web-push';
import { PrismaClient, Platform, NotificationAction } from '@prisma/client';
import { logger } from '../../api/src/lib/logger';
import { env } from '../../api/src/lib/env';

// ─── Init Firebase ────────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// ─── Init APNs ────────────────────────────────────────────────────────────────
const apnsProvider = new apn.Provider({
  token: {
    key:    env.APNS_PRIVATE_KEY,
    keyId:  env.APNS_KEY_ID,
    teamId: env.APNS_TEAM_ID,
  },
  production: env.APNS_PRODUCTION,
});

// ─── Init Web Push ────────────────────────────────────────────────────────────
webpush.setVapidDetails(
  `mailto:${env.VAPID_SUBJECT}`,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);

const prisma  = new PrismaClient();
const redis   = new Redis(env.REDIS_URL);

// ─── Notification payload builder ─────────────────────────────────────────────
function buildNotificationPayload(job: NotificationJobData) {
  const actionButtons = getActionButtons(job.type);

  return {
    title:   job.title,
    body:    `Reminder: ${job.title}`,
    data: {
      reminderId: job.reminderId,
      type:       job.type,
      action:     'open_reminder',
    },
    actions: actionButtons,
  };
}

function getActionButtons(type: string) {
  const common = [
    { id: 'SNOOZE_15', title: 'Snooze 15m' },
    { id: 'DISMISS',   title: 'Dismiss'     },
  ];

  if (type === 'call') {
    return [{ id: 'CALL_NOW', title: 'Call Now' }, ...common];
  }
  if (type === 'email') {
    return [{ id: 'OPEN_EMAIL', title: 'Open Mail' }, ...common];
  }
  return [{ id: 'MARK_DONE', title: 'Done' }, ...common];
}

// ─── FCM (Android + some iOS) ─────────────────────────────────────────────────
async function sendFCM(token: string, payload: ReturnType<typeof buildNotificationPayload>) {
  const message: admin.messaging.Message = {
    token,
    notification: {
      title: payload.title,
      body:  payload.body,
    },
    data: Object.fromEntries(
      Object.entries(payload.data).map(([k, v]) => [k, String(v)])
    ),
    android: {
      priority: 'high',
      notification: {
        channelId: 'reminders',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
  };

  return admin.messaging().send(message);
}

// ─── APNs (iOS) ───────────────────────────────────────────────────────────────
async function sendAPNs(deviceToken: string, payload: ReturnType<typeof buildNotificationPayload>) {
  const note = new apn.Notification();
  note.expiry    = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  note.badge     = 1;
  note.sound     = 'default';
  note.alert     = { title: payload.title, body: payload.body };
  note.payload   = { data: payload.data };
  note.topic     = env.APNS_BUNDLE_ID;
  note.pushType  = 'alert';
  note.priority  = 10;

  const result = await apnsProvider.send(note, deviceToken);
  if (result.failed.length > 0) {
    throw new Error(`APNs failed: ${JSON.stringify(result.failed[0]?.response)}`);
  }
  return result;
}

// ─── Web Push ─────────────────────────────────────────────────────────────────
async function sendWebPush(subscription: string, payload: ReturnType<typeof buildNotificationPayload>) {
  const sub = JSON.parse(subscription);
  return webpush.sendNotification(sub, JSON.stringify({
    title:   payload.title,
    body:    payload.body,
    data:    payload.data,
    actions: payload.actions,
    icon:    '/icons/notification-icon.png',
    badge:   '/icons/badge-icon.png',
  }));
}

// ─── Worker ───────────────────────────────────────────────────────────────────
interface NotificationJobData {
  reminderId: string;
  userId:     string;
  type:       string;
  title:      string;
}

const worker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    const { reminderId, userId, type, title } = job.data;
    logger.info({ jobId: job.id, reminderId, userId }, 'Processing notification');

    // Get all active device tokens for user
    const tokens = await prisma.pushDeviceToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) {
      logger.warn({ userId, reminderId }, 'No device tokens found');
      return;
    }

    const payload = buildNotificationPayload({ reminderId, userId, type, title });
    const results: Array<{ platform: Platform; success: boolean; error?: string }> = [];

    for (const deviceToken of tokens) {
      const logEntry = await prisma.notificationLog.create({
        data: {
          reminderId,
          userId,
          channel:  'push',
          status:   'queued',
          sentAt:   new Date(),
        },
      });

      try {
        let providerId: string | undefined;

        if (deviceToken.platform === Platform.android) {
          const msgId = await sendFCM(deviceToken.token, payload);
          providerId = typeof msgId === 'string' ? msgId : undefined;
        } else if (deviceToken.platform === Platform.ios) {
          await sendAPNs(deviceToken.token, payload);
          providerId = `apns-${Date.now()}`;
        } else if (deviceToken.platform === Platform.web) {
          await sendWebPush(deviceToken.token, payload);
          providerId = `vapid-${Date.now()}`;
        }

        await prisma.notificationLog.update({
          where: { id: logEntry.id },
          data:  { status: 'sent', providerId, deliveredAt: new Date() },
        });

        results.push({ platform: deviceToken.platform, success: true });
        logger.info({ reminderId, platform: deviceToken.platform, providerId }, 'Notification sent');

      } catch (err: any) {
        const errorMessage = err?.message ?? 'Unknown error';

        await prisma.notificationLog.update({
          where: { id: logEntry.id },
          data:  { status: 'failed', errorMessage },
        });

        // Deactivate invalid tokens
        if (
          errorMessage.includes('registration-token-not-registered') ||
          errorMessage.includes('BadDeviceToken')
        ) {
          await prisma.pushDeviceToken.update({
            where: { id: deviceToken.id },
            data:  { isActive: false },
          });
        }

        results.push({ platform: deviceToken.platform, success: false, error: errorMessage });
        logger.error({ reminderId, platform: deviceToken.platform, err }, 'Notification failed');
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info({ reminderId, successCount, total: tokens.length }, 'Notification batch complete');
  },
  {
    connection: redis,
    concurrency: 50,
  },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Notification job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Notification job failed');
});

process.on('SIGTERM', async () => {
  await worker.close();
  await apnsProvider.shutdown();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

logger.info('Notification worker started');
