import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// ─── Admin-specific middleware ────────────────────────────────────────────────
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

const PaginationSchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
});

const UsersQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  plan:   z.enum(['free', 'pro', 'team', 'family']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const RemindersQuerySchema = PaginationSchema.extend({
  userId: z.string().uuid().optional(),
  type:   z.enum(['call', 'task', 'email', 'location', 'event']).optional(),
  status: z.enum(['pending', 'completed', 'snoozed', 'deleted']).optional(),
});

const UpdateUserSchema = z.object({
  plan:   z.enum(['free', 'pro', 'team', 'family']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  role:   z.enum(['user', 'super_admin', 'administrator', 'moderator', 'support_agent', 'read_only']).optional(),
});

export async function adminRoutes(server: FastifyInstance) {
  // POST /admin/auth/login
  server.post(
    '/auth/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({ email: z.string().email(), password: z.string() });
      const input  = schema.parse(request.body);

      const admin = await server.prisma.adminUser.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, name: true, role: true, passwordHash: true, isActive: true },
      });

      if (!admin || !admin.isActive) {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(input.password, admin.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
      }

      const token = server.jwt.sign(
        { sub: admin.id, adminId: admin.id, email: admin.email, role: admin.role, plan: 'free' },
        { expiresIn: '8h' },
      );

      return reply.send({
        data: {
          user:   { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
          tokens: { access_token: token },
        },
      });
    },
  );

  // GET /admin/stats
  server.get(
    '/stats',
    { preHandler: [authenticateAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const now    = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart  = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const [
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        totalReminders,
        remindersCompletedToday,
        activeSubscriptions,
        proUsers,
        freeUsers,
      ] = await Promise.all([
        server.prisma.user.count({ where: { deletedAt: null } }),
        server.prisma.user.count({
          where: { deletedAt: null, createdAt: { gte: todayStart } },
        }),
        server.prisma.user.count({
          where: { deletedAt: null, createdAt: { gte: weekStart } },
        }),
        server.prisma.reminder.count({ where: { deletedAt: null } }),
        server.prisma.reminder.count({
          where: { status: 'completed', completedAt: { gte: todayStart } },
        }),
        server.prisma.subscription.count({
          where: { status: 'active' },
        }),
        server.prisma.user.count({ where: { plan: 'pro', deletedAt: null } }),
        server.prisma.user.count({ where: { plan: 'free', deletedAt: null } }),
      ]);

      return reply.send({
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        totalReminders,
        remindersCompletedToday,
        activeSubscriptions,
        proUsers,
        freeUsers,
      });
    },
  );

  // GET /admin/users
  server.get(
    '/users',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query  = UsersQuerySchema.parse(request.query);
      const skip   = (query.page - 1) * query.limit;

      const where: Record<string, unknown> = {};

      if (query.search) {
        const like = { contains: query.search, mode: 'insensitive' as const };
        where['OR'] = [{ name: like }, { email: like }];
      }

      if (query.plan) {
        where['plan'] = query.plan;
      }

      if (query.status === 'active') {
        where['deletedAt'] = null;
      } else if (query.status === 'inactive') {
        where['deletedAt'] = { not: null };
      }

      const [users, total] = await Promise.all([
        server.prisma.user.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id:         true,
            name:       true,
            email:      true,
            plan:       true,
            role:       true,
            createdAt:  true,
            deletedAt:  true,
            persona:    true,
            occupation: true,
            familyMemberships: {
              take: 1,
              select: {
                role: true,
                family: { select: { id: true, name: true } },
              },
            },
            teamMemberships: {
              take: 1,
              select: {
                role: true,
                workspace: { select: { id: true, name: true } },
              },
            },
            _count: {
              select: { reminders: true },
            },
          },
        }),
        server.prisma.user.count({ where }),
      ]);

      const data = users.map(u => {
        const fm = u.familyMemberships[0];
        const tm = u.teamMemberships[0];
        return {
          id:            u.id,
          name:          u.name,
          email:         u.email,
          plan:          u.plan,
          role:          u.role,
          createdAt:     u.createdAt,
          reminderCount: u._count.reminders,
          status:        u.deletedAt ? 'inactive' : 'active',
          persona:       u.persona,
          occupation:    u.occupation,
          familyGroupId:      fm?.family?.id      ?? null,
          familyGroupName:    fm?.family?.name     ?? null,
          familyRole:         fm?.role             ?? null,
          teamWorkspaceId:    tm?.workspace?.id    ?? null,
          teamWorkspaceName:  tm?.workspace?.name  ?? null,
          teamRole:           tm?.role             ?? null,
        };
      });

      return reply.send({ data, total, page: query.page, limit: query.limit });
    },
  );

  // GET /admin/reminders
  server.get(
    '/reminders',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = RemindersQuerySchema.parse(request.query);
      const skip  = (query.page - 1) * query.limit;

      const where: Record<string, unknown> = {};

      if (query.userId) where['userId'] = query.userId;
      if (query.type)   where['type']   = query.type;
      if (query.status) where['status'] = query.status;

      const [reminders, total] = await Promise.all([
        server.prisma.reminder.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { email: true },
            },
          },
        }),
        server.prisma.reminder.count({ where }),
      ]);

      const data = reminders.map(r => ({
        id:          r.id,
        userId:      r.userId,
        userEmail:   r.user.email,
        type:        r.type,
        title:       r.title,
        status:      r.status,
        priority:    r.priority,
        fireAt:      r.fireAt,
        completedAt: r.completedAt,
        createdAt:   r.createdAt,
        deletedAt:   r.deletedAt,
      }));

      return reply.send({ data, total, page: query.page, limit: query.limit });
    },
  );

  // POST /admin/users — create a new user account
  server.post(
    '/users',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z.object({
        name:     z.string().min(1).max(100),
        email:    z.string().email().max(255),
        password: z.string().min(8).max(128),
        plan:     z.enum(['free', 'pro', 'team', 'family']).default('free'),
        role:     z.enum(['user', 'super_admin', 'administrator', 'moderator', 'support_agent', 'read_only']).default('user'),
      }).parse(request.body);

      const existing = await server.prisma.user.findUnique({
        where: { email: body.email.toLowerCase().trim() },
      });
      if (existing) {
        return reply.status(409).send({ error: 'CONFLICT', message: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(body.password, 12);

      const user = await server.prisma.user.create({
        data: {
          name:         body.name.trim(),
          email:        body.email.toLowerCase().trim(),
          passwordHash,
          plan:         body.plan,
          role:         body.role,
          locale:       'en',
          timezone:     'UTC',
          theme:        'warm_corporate',
        },
        select: {
          id: true, name: true, email: true, plan: true, role: true,
          createdAt: true, deletedAt: true,
          _count: { select: { reminders: true } },
        },
      });

      await server.prisma.subscription.create({
        data: { userId: user.id, plan: body.plan, status: 'active' },
      });

      return reply.status(201).send({
        success: true,
        data: {
          id:            user.id,
          name:          user.name,
          email:         user.email,
          plan:          user.plan,
          role:          user.role,
          createdAt:     user.createdAt,
          reminderCount: user._count.reminders,
          status:        user.deletedAt ? 'inactive' : 'active',
        },
      });
    },
  );

  // POST /admin/users/bulk-role
  server.post(
    '/users/bulk-role',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z.object({
        userIds: z.array(z.string().uuid()).min(1),
        role:    z.enum(['user', 'super_admin', 'administrator', 'moderator', 'support_agent', 'read_only']),
      }).parse(request.body);

      await server.prisma.user.updateMany({
        where: { id: { in: body.userIds } },
        data:  { role: body.role },
      });

      return reply.send({ success: true, updated: body.userIds.length });
    },
  );

  // PATCH /admin/users/:id
  server.patch(
    '/users/:id',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body   = UpdateUserSchema.parse(request.body);

      const updateData: Record<string, unknown> = {};

      if (body.plan !== undefined) {
        updateData['plan'] = body.plan;
      }

      if (body.status !== undefined) {
        updateData['deletedAt'] = body.status === 'inactive' ? new Date() : null;
      }

      if (body.role !== undefined) {
        updateData['role'] = body.role;
      }

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' },
        });
      }

      const user = await server.prisma.user.update({
        where: { id },
        data:  updateData,
        select: {
          id:        true,
          name:      true,
          email:     true,
          plan:      true,
          role:      true,
          deletedAt: true,
          updatedAt: true,
        },
      });

      return reply.send({
        success: true,
        data: {
          ...user,
          status: user.deletedAt ? 'inactive' : 'active',
        },
      });
    },
  );

  // POST /admin/users/:id/reset-password — admin generates a temp password for a user
  server.post(
    '/users/:id/reset-password',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const user = await server.prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, isActive: true },
      });

      if (!user) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found' });
      }

      // Generate a secure random temporary password
      const tempPassword = crypto.randomBytes(8).toString('hex'); // 16-char hex
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      await server.prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          passwordResetToken:   null,
          passwordResetExpires: null,
        },
      });

      return reply.send({
        success: true,
        data: {
          userId:        user.id,
          email:         user.email,
          tempPassword,  // shown once — admin must share this with the user
        },
      });
    },
  );

  // GET /admin/countries — returns all countries with their languages
  server.get(
    '/countries',
    { preHandler: [authenticateAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const countries = await server.prisma.country.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          languages: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, name: true, code: true, isRtl: true, isActive: true },
          },
        },
      });
      return reply.send({ data: countries });
    },
  );
}
