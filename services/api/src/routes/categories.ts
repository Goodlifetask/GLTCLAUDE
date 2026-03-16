import { FastifyInstance } from 'fastify';
import { REMINDER_CATEGORIES } from '@glt/shared';

/** Public endpoint — returns system categories + any globally promoted user categories */
export async function categoriesRoutes(server: FastifyInstance) {
  server.get('/', async (_request, reply) => {
    // System (hardcoded) categories
    const system = REMINDER_CATEGORIES.map(c => ({
      slug:   c.slug,
      name:   c.name,
      icon:   c.icon,
      color:  c.color,
      source: 'system' as const,
    }));

    // User-defined categories that have been promoted to global
    // Guard: userCategory may not exist if Prisma client hasn't been regenerated yet
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
}
