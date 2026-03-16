import { FastifyInstance } from 'fastify';

/** Canonical persona slugs — mirrors the UserPersona enum */
const PERSONA_PROFESSIONS = [
  { value: 'student',       label: 'Student',       icon: '🎓' },
  { value: 'teacher',       label: 'Teacher',        icon: '📚' },
  { value: 'nurse',         label: 'Nurse',          icon: '🩺' },
  { value: 'doctor',        label: 'Doctor',         icon: '👨‍⚕️' },
  { value: 'engineer',      label: 'Engineer',       icon: '⚙️' },
  { value: 'developer',     label: 'Developer',      icon: '💻' },
  { value: 'manager',       label: 'Manager',        icon: '📊' },
  { value: 'entrepreneur',  label: 'Entrepreneur',   icon: '🚀' },
  { value: 'parent',        label: 'Parent',         icon: '👨‍👩‍👧' },
  { value: 'retiree',       label: 'Retiree',        icon: '🌅' },
  { value: 'chef',          label: 'Chef',           icon: '🍳' },
  { value: 'carpenter',     label: 'Carpenter',      icon: '🔨' },
  { value: 'other',         label: 'Other',          icon: '👤' },
];

/**
 * GET /v1/professions — public
 * Returns canonical personas + any unique occupation strings that existing
 * users have typed in (max 50 most common), so the combobox stays fresh.
 */
export async function professionsRoutes(server: FastifyInstance) {
  server.get('/', async (_request, reply) => {
    // Pull distinct occupations entered by real users
    const rows = await server.prisma.user.findMany({
      where:   { occupation: { not: null }, deletedAt: null },
      select:  { occupation: true },
      distinct: ['occupation'],
      take:    50,
      orderBy: { createdAt: 'desc' },
    });

    const userOccupations: string[] = rows
      .map((r: { occupation: string | null }) => r.occupation as string)
      .filter(Boolean);

    // Merge: canonical list first, then unique user-typed ones not already covered
    const canonicalLabels = new Set(
      PERSONA_PROFESSIONS.map(p => p.label.toLowerCase()),
    );

    const extra = userOccupations
      .filter(o => !canonicalLabels.has(o.toLowerCase()))
      .map(o => ({ value: o, label: o, icon: '👤' }));

    return reply.send({
      success: true,
      data: [...PERSONA_PROFESSIONS, ...extra],
    });
  });
}
