import { FastifyInstance } from 'fastify';

export async function countriesRoutes(server: FastifyInstance) {
  // GET /v1/countries — public, returns all countries with their languages
  server.get('/', async (_request, reply) => {
    const countries = await server.prisma.country.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        languages: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, code: true, isRtl: true },
        },
      },
    });
    return reply.send({ success: true, data: countries });
  });
}
