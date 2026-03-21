import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { REMINDER_CATEGORIES } from '@glt/shared';

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

/** Categories routes — public read + admin management */
export async function categoriesRoutes(server: FastifyInstance) {

  // ── Public: GET / ─────────────────────────────────────────────────────────
  /** Returns system categories + any globally promoted user categories */
  server.get('/', async (_request, reply) => {
    const system = REMINDER_CATEGORIES.map(c => ({
      slug:   c.slug,
      name:   c.name,
      icon:   c.icon,
      color:  c.color,
      source: 'system' as const,
    }));

    // User-defined categories that have been promoted to global
    let promoted: { slug: string; name: string; icon: string; color: string }[] = [];
    try {
      if ((server.prisma as any).userCategory) {
        promoted = await (server.prisma as any).userCategory.findMany({
          where: { isGlobal: true, status: 'approved' },
          orderBy: { suggestCount: 'desc' },
          select: { slug: true, name: true, icon: true, color: true },
        });
      }
    } catch {
      // Table not yet migrated — just return system categories
    }

    const promotedMapped = promoted.map(c => ({ ...c, source: 'community' as const }));

    // Deduplicate (system takes priority)
    const systemSlugs = new Set(system.map(c => c.slug));
    const merged = [
      ...system,
      ...promotedMapped.filter(c => !systemSlugs.has(c.slug)),
    ];

    return reply.send({ success: true, data: merged });
  });

  // ── Admin: GET /admin/user ─────────────────────────────────────────────────
  /** List all user-submitted categories with optional status filter */
  server.get('/admin/user', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    try {
      const where: any = {};
      if (status) where.status = status;
      const cats = await server.prisma.userCategory.findMany({
        where,
        orderBy: { suggestCount: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      });
      return reply.send({ success: true, data: cats });
    } catch {
      return reply.send({ success: true, data: [] });
    }
  });

  // ── Admin: PATCH /admin/user/:id/status ───────────────────────────────────
  /** Approve or reject a user-submitted category */
  server.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/admin/user/:id/status',
    { preHandler: authenticateAdmin },
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body;

      if (!['approved', 'rejected'].includes(status)) {
        return reply.status(400).send({ success: false, message: 'Status must be approved or rejected' });
      }

      try {
        const cat = await server.prisma.userCategory.update({
          where: { id },
          data: { status: status as any },
        });
        return reply.send({ success: true, data: cat });
      } catch {
        return reply.status(404).send({ success: false, message: 'Category not found' });
      }
    },
  );

  // ── Admin: PATCH /admin/user/:id/promote ──────────────────────────────────
  /** Promote an approved user category to a global system-visible category */
  server.patch<{ Params: { id: string } }>(
    '/admin/user/:id/promote',
    { preHandler: authenticateAdmin },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const cat = await server.prisma.userCategory.update({
          where: { id },
          data: { isGlobal: true, status: 'approved' as any },
        });
        return reply.send({ success: true, data: cat });
      } catch {
        return reply.status(404).send({ success: false, message: 'Category not found' });
      }
    },
  );

  // ── Admin: GET /admin/custom ───────────────────────────────────────────────
  /** List admin-created custom categories */
  server.get('/admin/custom', { preHandler: authenticateAdmin }, async (_request, reply) => {
    try {
      const cats = await (server.prisma as any).userCategory.findMany({
        where: { adminCreated: true },
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ success: true, data: cats });
    } catch {
      return reply.send({ success: true, data: [] });
    }
  });

  // ── Admin: POST /admin/custom ──────────────────────────────────────────────
  /** Create a new admin-managed global category */
  server.post<{ Body: { name: string; icon?: string; color?: string } }>(
    '/admin/custom',
    { preHandler: authenticateAdmin },
    async (request, reply) => {
      const { name, icon = '📁', color = '#6366f1' } = request.body;

      if (!name?.trim()) {
        return reply.status(400).send({ success: false, message: 'Name is required' });
      }

      const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Guard: prevent duplicate admin category with same slug
      const existing = await (server.prisma as any).userCategory.findFirst({
        where: { slug, adminCreated: true },
      });
      if (existing) {
        return reply.status(409).send({ success: false, message: `A category named "${name}" already exists` });
      }

      try {
        const cat = await (server.prisma as any).userCategory.create({
          data: {
            userId:       null,
            name:         name.trim(),
            slug,
            icon:         icon.trim() || '📁',
            color:        color || '#6366f1',
            status:       'approved',
            isGlobal:     true,
            adminCreated: true,
            suggestCount: 0,
          },
        });
        return reply.status(201).send({ success: true, data: cat });
      } catch (err: any) {
        return reply.status(500).send({ success: false, message: 'Failed to create category' });
      }
    },
  );

  // ── Admin: DELETE /admin/custom/:id ───────────────────────────────────────
  /** Delete an admin-created custom category */
  server.delete<{ Params: { id: string } }>(
    '/admin/custom/:id',
    { preHandler: authenticateAdmin },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const cat = await (server.prisma as any).userCategory.findUnique({ where: { id } });
        if (!cat) return reply.status(404).send({ success: false, message: 'Category not found' });
        if (!cat.adminCreated) return reply.status(403).send({ success: false, message: 'Cannot delete user-submitted categories' });

        await (server.prisma as any).userCategory.delete({ where: { id } });
        return reply.status(204).send();
      } catch {
        return reply.status(500).send({ success: false, message: 'Failed to delete category' });
      }
    },
  );
}
