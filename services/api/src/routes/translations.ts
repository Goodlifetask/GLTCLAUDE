import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as any;
    if (!payload.adminId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Admin access required' });
    }
  } catch {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

const NAMESPACES = ['nav', 'page', 'btn', 'form', 'badge', 'msg', 'table', 'common'] as const;

export async function translationsRoutes(server: FastifyInstance) {

  // ── GET /admin/translations/keys ─────────────────────────────────────────
  // List all translation keys with optional namespace filter
  server.get('/keys', { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = z.object({
        namespace: z.string().optional(),
        search:    z.string().optional(),
        page:      z.coerce.number().int().positive().default(1),
        limit:     z.coerce.number().int().positive().max(200).default(50),
      }).parse(request.query);

      const where: Record<string, any> = {};
      if (query.namespace) where.namespace = query.namespace;
      if (query.search) {
        where.OR = [
          { key:          { contains: query.search, mode: 'insensitive' } },
          { defaultValue: { contains: query.search, mode: 'insensitive' } },
          { description:  { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const skip = (query.page - 1) * query.limit;
      const [keys, total] = await Promise.all([
        server.prisma.translationKey.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
          include: { translations: true },
        }),
        server.prisma.translationKey.count({ where }),
      ]);

      return reply.send({ data: keys, total, page: query.page, limit: query.limit });
    }
  );

  // ── GET /admin/translations/language/:langCode ────────────────────────────
  // Get all keys with their translation for a given language
  // Missing translations show value: null
  server.get('/language/:langCode', { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { langCode } = request.params as { langCode: string };
      const query = z.object({
        namespace: z.string().optional(),
        onlyMissing: z.coerce.boolean().optional(), // only show untranslated
        search:    z.string().optional(),
      }).parse(request.query);

      const where: Record<string, any> = { isActive: true };
      if (query.namespace) where.namespace = query.namespace;
      if (query.search) {
        where.OR = [
          { key:          { contains: query.search, mode: 'insensitive' } },
          { defaultValue: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const keys = await server.prisma.translationKey.findMany({
        where,
        orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
        include: {
          translations: {
            where: { langCode },
          },
        },
      });

      const result = keys.map(k => ({
        keyId:        k.id,
        key:          k.key,
        namespace:    k.namespace,
        description:  k.description,
        defaultValue: k.defaultValue,
        isStatic:     k.isStatic,
        translation:  k.translations[0]?.value ?? null,
      }));

      const filtered = query.onlyMissing ? result.filter(r => !r.translation) : result;

      return reply.send({
        langCode,
        total:      result.length,
        translated: result.filter(r => r.translation).length,
        missing:    result.filter(r => !r.translation).length,
        data:       filtered,
      });
    }
  );

  // ── PUT /admin/translations ───────────────────────────────────────────────
  // Upsert a translation (create or update) for key + language
  server.put('/', { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z.object({
        keyId:      z.string().uuid(),
        langCode:   z.string().min(2).max(20),
        value:      z.string().min(0).max(5000),
        isApproved: z.boolean().optional().default(true),
      }).parse(request.body);

      const adminPayload = request.user as any;

      // Verify key exists
      const key = await server.prisma.translationKey.findUnique({ where: { id: body.keyId } });
      if (!key) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Translation key not found' });
      }

      const translation = await server.prisma.translation.upsert({
        where: { keyId_langCode: { keyId: body.keyId, langCode: body.langCode } },
        update: {
          value:      body.value,
          isApproved: body.isApproved,
          updatedBy:  adminPayload.email,
        },
        create: {
          keyId:     body.keyId,
          langCode:  body.langCode,
          value:     body.value,
          isApproved: body.isApproved,
          updatedBy: adminPayload.email,
        },
      });

      return reply.send({ success: true, data: translation });
    }
  );

  // ── PUT /admin/translations/bulk ──────────────────────────────────────────
  // Bulk upsert translations for a language (import JSON / paste)
  server.put('/bulk', { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z.object({
        langCode: z.string().min(2).max(20),
        translations: z.array(z.object({
          keyId:  z.string().uuid(),
          value:  z.string().max(5000),
        })).min(1).max(500),
      }).parse(request.body);

      const adminPayload = request.user as any;

      let upserted = 0;
      for (const t of body.translations) {
        await server.prisma.translation.upsert({
          where: { keyId_langCode: { keyId: t.keyId, langCode: body.langCode } },
          update: { value: t.value, isApproved: true, updatedBy: adminPayload.email },
          create: { keyId: t.keyId, langCode: body.langCode, value: t.value, isApproved: true, updatedBy: adminPayload.email },
        });
        upserted++;
      }

      return reply.send({ success: true, upserted });
    }
  );

  // ── POST /admin/translations/keys ─────────────────────────────────────────
  // Create a new translation key
  server.post('/keys', { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z.object({
        key:          z.string().min(1).max(255).regex(/^[\w.:-]+$/, 'Only alphanumeric, dots, hyphens, underscores, colons'),
        namespace:    z.enum(NAMESPACES).default('common'),
        description:  z.string().max(500).optional(),
        defaultValue: z.string().min(1).max(5000),
        isStatic:     z.boolean().default(true),
      }).parse(request.body);

      const existing = await server.prisma.translationKey.findUnique({ where: { key: body.key } });
      if (existing) {
        return reply.status(409).send({ error: 'CONFLICT', message: 'Translation key already exists' });
      }

      const created = await server.prisma.translationKey.create({ data: body });
      return reply.status(201).send({ success: true, data: created });
    }
  );

  // ── PATCH /admin/translations/keys/:id ───────────────────────────────────
  // Update key metadata (description, defaultValue, isActive)
  server.patch('/keys/:id', { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = z.object({
        description:  z.string().max(500).optional(),
        defaultValue: z.string().max(5000).optional(),
        isActive:     z.boolean().optional(),
      }).parse(request.body);

      const updated = await server.prisma.translationKey.update({
        where: { id },
        data:  body,
      });

      return reply.send({ success: true, data: updated });
    }
  );

  // ── GET /admin/translations/export/:langCode ──────────────────────────────
  // Export translations as a flat JSON object { "key": "value" }
  server.get('/export/:langCode', { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { langCode } = request.params as { langCode: string };

      const keys = await server.prisma.translationKey.findMany({
        where: { isActive: true },
        include: { translations: { where: { langCode } } },
        orderBy: { key: 'asc' },
      });

      const json: Record<string, string> = {};
      for (const k of keys) {
        json[k.key] = k.translations[0]?.value ?? k.defaultValue;
      }

      return reply
        .header('Content-Disposition', `attachment; filename="translations.${langCode}.json"`)
        .header('Content-Type', 'application/json')
        .send(json);
    }
  );
}
