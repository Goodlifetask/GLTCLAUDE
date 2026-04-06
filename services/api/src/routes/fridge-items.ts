import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { FridgeItemService } from '../services/fridge-item.service';
import { getFoodRecognitionProvider } from '../services/food-recognition.service';
import { authenticate } from '../middleware/auth';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOADS_DIR = path.resolve(__dirname, '../../../public/uploads/fridge');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const uuidParam = z.string().uuid();

function parseId(id: string, reply: FastifyReply): string | null {
  const r = uuidParam.safeParse(id);
  if (!r.success) {
    reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid ID format' });
    return null;
  }
  return r.data;
}

const createSchema = z.object({
  name:              z.string().min(1).max(255),
  quantity:          z.string().max(100).optional(),
  storage_type:      z.enum(['fridge', 'freezer']).default('fridge'),
  expiration_date:   z.string().datetime().optional(),
  expiry_type:       z.enum(['exact', 'estimated']).optional(),
  notes:             z.string().max(5000).optional(),
  family_group_id:   z.string().uuid().optional(),
});

const updateSchema = z.object({
  name:              z.string().min(1).max(255).optional(),
  quantity:          z.string().max(100).nullable().optional(),
  storage_type:      z.enum(['fridge', 'freezer']).optional(),
  expiration_date:   z.string().datetime().nullable().optional(),
  expiry_type:       z.enum(['exact', 'estimated']).optional(),
  status:            z.enum(['fresh', 'use_soon', 'expiring_soon', 'expired', 'donated', 'used', 'discarded']).optional(),
  notes:             z.string().max(5000).nullable().optional(),
});

const listQuerySchema = z.object({
  page:                z.coerce.number().int().min(1).default(1),
  limit:               z.coerce.number().int().min(1).max(100).default(50),
  status:              z.string().optional(),
  storage_type:        z.enum(['fridge', 'freezer']).optional(),
  expiring_within_days: z.coerce.number().int().min(1).optional(),
});

export async function fridgeItemsRoutes(server: FastifyInstance) {
  const svc = new FridgeItemService(server.prisma);

  // ── GET /v1/fridge-items ─────────────────────────────────────────────────
  server.get('/', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user.sub;
    const q = listQuerySchema.parse(req.query);
    const result = await svc.list(userId, {
      page:               q.page,
      limit:              q.limit,
      status:             q.status as any,
      storageType:        q.storage_type as any,
      expiringWithinDays: q.expiring_within_days,
    });
    return reply.send({ success: true, ...result });
  });

  // ── GET /v1/fridge-items/stats ────────────────────────────────────────────
  server.get('/stats', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const stats = await svc.stats(req.user.sub);
    return reply.send({ success: true, data: stats });
  });

  // ── GET /v1/fridge-items/family ───────────────────────────────────────────
  server.get('/family', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user.sub;
    const member = await server.prisma.familyMember.findFirst({ where: { userId } });
    if (!member) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'You are not in a family group.' });
    }
    const q = listQuerySchema.parse(req.query);
    const result = await svc.listForFamily(member.familyId, {
      page: q.page, limit: q.limit,
      status: q.status as any,
      storageType: q.storage_type as any,
    });
    return reply.send({ success: true, ...result });
  });

  // ── GET /v1/fridge-items/:id ──────────────────────────────────────────────
  server.get('/:id', { preHandler: [authenticate] }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseId(req.params.id, reply);
    if (!id) return;
    try {
      const item = await svc.findById(id, req.user.sub);
      return reply.send({ success: true, data: item });
    } catch (e: any) {
      return reply.status(e.statusCode ?? 500).send({ error: e.code ?? 'ERROR', message: e.message });
    }
  });

  // ── POST /v1/fridge-items ─────────────────────────────────────────────────
  server.post('/', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user.sub;
    const body = createSchema.parse(req.body);

    const item = await svc.create({
      userId,
      familyGroupId:   body.family_group_id,
      name:            body.name,
      quantity:        body.quantity,
      storageType:     body.storage_type,
      expirationDate:  body.expiration_date ? new Date(body.expiration_date) : undefined,
      expiryType:      body.expiry_type,
      notes:           body.notes,
    });

    return reply.status(201).send({ success: true, data: item });
  });

  // ── PATCH /v1/fridge-items/:id ────────────────────────────────────────────
  server.patch('/:id', { preHandler: [authenticate] }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseId(req.params.id, reply);
    if (!id) return;
    const body = updateSchema.parse(req.body);
    try {
      const item = await svc.update(id, req.user.sub, {
        name:           body.name,
        quantity:       body.quantity ?? undefined,
        storageType:    body.storage_type,
        expirationDate: body.expiration_date ? new Date(body.expiration_date) : undefined,
        expiryType:     body.expiry_type,
        status:         body.status as any,
        notes:          body.notes ?? undefined,
      });
      return reply.send({ success: true, data: item });
    } catch (e: any) {
      return reply.status(e.statusCode ?? 500).send({ error: e.code ?? 'ERROR', message: e.message });
    }
  });

  // ── POST /v1/fridge-items/:id/move ────────────────────────────────────────
  server.post('/:id/move', { preHandler: [authenticate] }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseId(req.params.id, reply);
    if (!id) return;
    const { to } = z.object({ to: z.enum(['fridge', 'freezer']) }).parse(req.body);
    try {
      const item = await svc.move(id, req.user.sub, to);
      return reply.send({ success: true, data: item });
    } catch (e: any) {
      return reply.status(e.statusCode ?? 500).send({ error: e.code ?? 'ERROR', message: e.message });
    }
  });

  // ── POST /v1/fridge-items/:id/status ─────────────────────────────────────
  server.post('/:id/status', { preHandler: [authenticate] }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseId(req.params.id, reply);
    if (!id) return;
    const { status } = z.object({
      status: z.enum(['fresh', 'use_soon', 'expiring_soon', 'expired', 'donated', 'used', 'discarded']),
    }).parse(req.body);
    try {
      const item = await svc.markStatus(id, req.user.sub, status as any);
      return reply.send({ success: true, data: item });
    } catch (e: any) {
      return reply.status(e.statusCode ?? 500).send({ error: e.code ?? 'ERROR', message: e.message });
    }
  });

  // ── POST /v1/fridge-items/:id/notify-family ───────────────────────────────
  server.post('/:id/notify-family', { preHandler: [authenticate] }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseId(req.params.id, reply);
    if (!id) return;
    try {
      const result = await svc.notifyFamily(id, req.user.sub);
      return reply.send({ success: true, ...result });
    } catch (e: any) {
      return reply.status(e.statusCode ?? 500).send({ error: e.code ?? 'ERROR', message: e.message });
    }
  });

  // ── DELETE /v1/fridge-items/:id ───────────────────────────────────────────
  server.delete('/:id', { preHandler: [authenticate] }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseId(req.params.id, reply);
    if (!id) return;
    try {
      await svc.softDelete(id, req.user.sub);
      return reply.status(204).send();
    } catch (e: any) {
      return reply.status(e.statusCode ?? 500).send({ error: e.code ?? 'ERROR', message: e.message });
    }
  });

  // ── POST /v1/fridge-items/:id/image ──────────────────────────────────────
  // Upload / replace item image
  server.post('/:id/image', { preHandler: [authenticate] }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseId(req.params.id, reply);
    if (!id) return;

    const data = await (req as any).file();
    if (!data) return reply.status(400).send({ error: 'NO_FILE', message: 'No file uploaded' });
    if (!ALLOWED_IMAGE_MIME.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'INVALID_MIME', message: 'Only JPEG, PNG, WebP, GIF, HEIC images are allowed' });
    }

    ensureUploadsDir();
    const ext = data.mimetype.split('/')[1].replace('jpeg', 'jpg').replace('heic', 'jpg');
    const fileName = `${id}_${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    let bytesWritten = 0;
    const dest = fs.createWriteStream(filePath);
    try {
      await pipeline(
        data.file.pipe(require('stream').Transform({
          transform(chunk: any, _: any, cb: any) {
            bytesWritten += chunk.length;
            if (bytesWritten > MAX_IMAGE_BYTES) {
              cb(new Error('FILE_TOO_LARGE'));
            } else {
              cb(null, chunk);
            }
          },
        })),
        dest,
      );
    } catch (err: any) {
      fs.unlink(filePath, () => {});
      return reply.status(413).send({ error: 'FILE_TOO_LARGE', message: 'Max 10 MB' });
    }

    const imageUrl = `/uploads/fridge/${fileName}`;
    try {
      const item = await svc.setImageUrl(id, req.user.sub, imageUrl);
      return reply.send({ success: true, data: { imageUrl, item } });
    } catch (e: any) {
      return reply.status(e.statusCode ?? 500).send({ error: e.code ?? 'ERROR', message: e.message });
    }
  });

  // ── POST /v1/fridge-items/analyze ────────────────────────────────────────
  // Analyze a photo and return detected food items (does NOT save them yet)
  server.post('/analyze', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const data = await (req as any).file();
    if (!data) return reply.status(400).send({ error: 'NO_FILE', message: 'No file uploaded' });
    if (!ALLOWED_IMAGE_MIME.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'INVALID_MIME', message: 'Only image files allowed' });
    }

    // Read image into buffer for provider
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const imageBuffer = Buffer.concat(chunks);

    if (imageBuffer.length > MAX_IMAGE_BYTES) {
      return reply.status(413).send({ error: 'FILE_TOO_LARGE', message: 'Max 10 MB' });
    }

    // Save capture image for reference
    ensureUploadsDir();
    const ext = data.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const fileName = `capture_${req.user.sub}_${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, imageBuffer);
    const captureImageUrl = `/uploads/fridge/${fileName}`;

    const provider = getFoodRecognitionProvider();
    const result = await provider.analyze(imageBuffer, data.mimetype);

    return reply.send({
      success: true,
      captureImageUrl,
      provider: result.provider,
      items: result.items,
    });
  });

  // ── POST /v1/fridge-items/batch ───────────────────────────────────────────
  // Save a batch of detected items (returned by /analyze)
  server.post('/batch', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user.sub;
    const bodySchema = z.object({
      capture_image_url: z.string().optional(),
      family_group_id:   z.string().uuid().optional(),
      items: z.array(z.object({
        name:            z.string().min(1).max(255),
        quantity:        z.string().max(100).optional(),
        storage_type:    z.enum(['fridge', 'freezer']).default('fridge'),
        expiration_date: z.string().datetime().optional(),
        expiry_type:     z.enum(['exact', 'estimated']).optional(),
        notes:           z.string().max(5000).optional(),
      })).min(1).max(20),
    });

    const body = bodySchema.parse(req.body);

    const member = body.family_group_id
      ? await server.prisma.familyMember.findFirst({ where: { userId } })
      : null;

    const items = await svc.createBatch(
      body.items.map(i => ({
        userId,
        familyGroupId:   member?.familyId ?? body.family_group_id,
        name:            i.name,
        quantity:        i.quantity,
        storageType:     i.storage_type,
        captureImageUrl: body.capture_image_url,
        expirationDate:  i.expiration_date ? new Date(i.expiration_date) : undefined,
        expiryType:      i.expiry_type,
        notes:           i.notes,
        detectedFromImage: true,
      })),
    );

    return reply.status(201).send({ success: true, data: items, total: items.length });
  });
}
