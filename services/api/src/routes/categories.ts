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
}
