import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { FamilyAlarmService, VOICE_LABELS } from '../services/family-alarm.service';
import { authenticate } from '../middleware/auth';
import { env } from '../lib/env';

// ── Schemas ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  title:          z.string().min(1).max(255),
  voice_label:    z.string().min(1).max(50).default('Loved One'),
  fire_at:        z.string().datetime(),
  repeat_rule:    z.string().max(500).optional(),
  notes:          z.string().max(5000).optional(),
  gradual_volume: z.boolean().default(true),
});

const updateSchema = z.object({
  title:          z.string().min(1).max(255).optional(),
  voice_label:    z.string().min(1).max(50).optional(),
  fire_at:        z.string().datetime().optional(),
  repeat_rule:    z.string().max(500).nullable().optional(),
  notes:          z.string().max(5000).nullable().optional(),
  gradual_volume: z.boolean().optional(),
  active:         z.boolean().optional(),
});

const listQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const uuidParam = z.string().uuid();

function parseId(id: string, reply: FastifyReply): string | null {
  const r = uuidParam.safeParse(id);
  if (!r.success) {
    reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid ID format' });
    return null;
  }
  return r.data;
}

const ALLOWED_AUDIO_MIME = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a'];
const MAX_VOICE_BYTES = 20 * 1024 * 1024; // 20 MB

// ── Route registration ─────────────────────────────────────────────────────

export async function familyAlarmsRoutes(server: FastifyInstance) {
  let alarmQueue: Queue | null = null;
  try {
    alarmQueue = new Queue('family-alarms', {
      connection: new Redis(env.REDIS_URL),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
    await alarmQueue.waitUntilReady();
  } catch (e) {
    server.log.warn('Family alarm queue unavailable — scheduling disabled');
    alarmQueue = null;
  }

  const service = new FamilyAlarmService(server.prisma, alarmQueue);

  // ── GET /v1/family-alarms/plan-status ──────────────────────────────────
  server.get('/plan-status', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id as string;
    const status = await service.planStatus(userId);
    return reply.send({ data: status });
  });

  // ── GET /v1/family-alarms/voice-labels ─────────────────────────────────
  server.get('/voice-labels', { preHandler: [authenticate] }, async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ data: VOICE_LABELS });
  });

  // ── GET /v1/family-alarms ──────────────────────────────────────────────
  server.get('/', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id as string;
    const query = listQuerySchema.safeParse(req.query);
    if (!query.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: query.error.message });
    const result = await service.list(userId, query.data.page, query.data.limit);
    return reply.send(result);
  });

  // ── POST /v1/family-alarms ─────────────────────────────────────────────
  server.post('/', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id as string;
    const body = createSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: body.error.message });

    try {
      const alarm = await service.create({
        userId,
        title:         body.data.title,
        voiceLabel:    body.data.voice_label,
        fireAt:        new Date(body.data.fire_at),
        repeatRule:    body.data.repeat_rule,
        notes:         body.data.notes,
        gradualVolume: body.data.gradual_volume,
      });
      return reply.status(201).send({ data: alarm });
    } catch (err: any) {
      if (err.statusCode === 402) return reply.status(402).send({ error: 'PLAN_LIMIT_REACHED', message: err.message, code: err.code });
      throw err;
    }
  });

  // ── GET /v1/family-alarms/:id ──────────────────────────────────────────
  server.get('/:id', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id as string;
    const id = parseId((req.params as any).id, reply);
    if (!id) return;
    try {
      const alarm = await service.findById(id, userId);
      return reply.send({ data: alarm });
    } catch (err: any) {
      if (err.statusCode === 404) return reply.status(404).send({ error: 'NOT_FOUND', message: err.message });
      throw err;
    }
  });

  // ── PATCH /v1/family-alarms/:id ────────────────────────────────────────
  server.patch('/:id', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id as string;
    const id = parseId((req.params as any).id, reply);
    if (!id) return;

    const body = updateSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: body.error.message });

    try {
      const alarm = await service.update(id, userId, {
        title:         body.data.title,
        voiceLabel:    body.data.voice_label,
        fireAt:        body.data.fire_at ? new Date(body.data.fire_at) : undefined,
        repeatRule:    body.data.repeat_rule ?? undefined,
        notes:         body.data.notes ?? undefined,
        gradualVolume: body.data.gradual_volume,
        active:        body.data.active,
      });
      return reply.send({ data: alarm });
    } catch (err: any) {
      if (err.statusCode === 404) return reply.status(404).send({ error: 'NOT_FOUND', message: err.message });
      throw err;
    }
  });

  // ── DELETE /v1/family-alarms/:id ───────────────────────────────────────
  server.delete('/:id', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id as string;
    const id = parseId((req.params as any).id, reply);
    if (!id) return;
    try {
      await service.softDelete(id, userId);
      return reply.status(204).send();
    } catch (err: any) {
      if (err.statusCode === 404) return reply.status(404).send({ error: 'NOT_FOUND', message: err.message });
      throw err;
    }
  });

  // ── POST /v1/family-alarms/:id/voice — upload/replace voice file ───────
  server.post('/:id/voice', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id as string;
    const id = parseId((req.params as any).id, reply);
    if (!id) return;

    // Verify ownership first
    let alarm;
    try {
      alarm = await service.findById(id, userId);
    } catch (err: any) {
      if (err.statusCode === 404) return reply.status(404).send({ error: 'NOT_FOUND', message: err.message });
      throw err;
    }

    const data = await req.file({ limits: { fileSize: MAX_VOICE_BYTES } });
    if (!data) return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'No file uploaded' });

    if (!ALLOWED_AUDIO_MIME.includes(data.mimetype)) {
      await data.file.resume(); // drain stream
      return reply.status(400).send({
        error: 'INVALID_FILE_TYPE',
        message: `Unsupported audio format. Allowed: ${ALLOWED_AUDIO_MIME.join(', ')}`,
      });
    }

    const extMap: Record<string, string> = {
      'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
      'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a',
    };
    const ext = extMap[data.mimetype] ?? 'audio';
    const filename = `${id}_${Date.now()}.${ext}`;
    const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'voice-alarms');

    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const destPath = path.join(uploadsDir, filename);
    await pipeline(data.file, fs.createWriteStream(destPath));

    const voiceFileUrl = `/uploads/voice-alarms/${filename}`;

    // Delete old file if it was a local upload
    if (alarm.voiceFileUrl?.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', '..', 'public', alarm.voiceFileUrl);
      fs.unlink(oldPath, () => {}); // best-effort
    }

    const updated = await service.update(id, userId, { voiceFileUrl });
    return reply.send({ data: updated });
  });
}
