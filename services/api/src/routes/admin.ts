import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { readMenuConfig, writeMenuConfig } from './menu-config';

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
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({ email: z.string().email(), password: z.string() });
      const input  = schema.parse(request.body);

      const admin = await server.prisma.adminUser.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, name: true, role: true, passwordHash: true, isActive: true },
      });

      if (!admin || !admin.isActive) {
        // Timing-safe: always run bcrypt to prevent user enumeration via response time
        await bcrypt.hash('dummy', 12);
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

  // ── Family Management ────────────────────────────────────────────────────────

  // GET /admin/families — list all family groups with members
  server.get(
    '/families',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = PaginationSchema.extend({
        search: z.string().optional(),
      }).parse(request.query);
      const skip = (query.page - 1) * query.limit;

      const where: any = {};
      if (query.search) {
        where.name = { contains: query.search, mode: 'insensitive' };
      }

      const [families, total] = await Promise.all([
        server.prisma.family.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            owner: { select: { id: true, name: true, email: true } },
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
            },
          },
        }),
        server.prisma.family.count({ where }),
      ]);

      return reply.send({ data: families, total, page: query.page, limit: query.limit });
    },
  );

  // POST /admin/families — create a family group and assign an owner
  server.post(
    '/families',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z.object({
        name:    z.string().min(1).max(100),
        ownerId: z.string().uuid(),
      }).parse(request.body);

      // Check owner exists
      const owner = await server.prisma.user.findUnique({ where: { id: body.ownerId } });
      if (!owner) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Owner user not found.' });

      // Check owner not already in a family
      const existing = await server.prisma.familyMember.findFirst({ where: { userId: body.ownerId } });
      if (existing) return reply.status(409).send({ error: 'CONFLICT', message: 'This user is already in a family.' });

      const family = await server.prisma.$transaction(async (tx) => {
        const f = await tx.family.create({
          data: {
            name:    body.name,
            ownerId: body.ownerId,
            members: { create: { userId: body.ownerId, role: 'owner' } },
          },
          include: {
            owner:   { select: { id: true, name: true, email: true } },
            members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
          },
        });
        await tx.user.update({ where: { id: body.ownerId }, data: { plan: 'family' } });
        return f;
      });

      return reply.status(201).send({ success: true, data: family });
    },
  );

  // POST /admin/families/:familyId/members — add a user to a family
  server.post(
    '/families/:familyId/members',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { familyId } = request.params as { familyId: string };
      const body = z.object({
        userId: z.string().uuid(),
        role:   z.enum(['owner', 'adult', 'child']).default('adult'),
      }).parse(request.body);

      const family = await server.prisma.family.findUnique({ where: { id: familyId } });
      if (!family) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Family not found.' });

      const user = await server.prisma.user.findUnique({ where: { id: body.userId } });
      if (!user) return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found.' });

      const alreadyMember = await server.prisma.familyMember.findFirst({ where: { userId: body.userId } });
      if (alreadyMember) return reply.status(409).send({ error: 'CONFLICT', message: 'User is already in a family.' });

      await server.prisma.$transaction([
        server.prisma.familyMember.create({
          data: { familyId, userId: body.userId, role: body.role },
        }),
        server.prisma.user.update({ where: { id: body.userId }, data: { plan: 'family' } }),
      ]);

      const updated = await server.prisma.family.findUnique({
        where: { id: familyId },
        include: {
          owner:   { select: { id: true, name: true, email: true } },
          members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
      });

      return reply.status(201).send({ success: true, data: updated });
    },
  );

  // DELETE /admin/families/:familyId/members/:userId — remove a user from a family
  server.delete(
    '/families/:familyId/members/:userId',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { familyId, userId } = request.params as { familyId: string; userId: string };

      const family = await server.prisma.family.findUnique({ where: { id: familyId } });
      if (!family) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Family not found.' });

      if (family.ownerId === userId) {
        return reply.status(400).send({ error: 'INVALID_OPERATION', message: 'Cannot remove the family owner. Delete the family or transfer ownership first.' });
      }

      await server.prisma.familyMember.delete({
        where: { familyId_userId: { familyId, userId } },
      });

      return reply.status(204).send();
    },
  );

  // DELETE /admin/families/:familyId — delete an entire family
  server.delete(
    '/families/:familyId',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { familyId } = request.params as { familyId: string };

      const family = await server.prisma.family.findUnique({ where: { id: familyId } });
      if (!family) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Family not found.' });

      await server.prisma.family.delete({ where: { id: familyId } });

      return reply.status(204).send();
    },
  );

  // GET /admin/menu-config — returns current menu config (authenticated)
  server.get(
    '/menu-config',
    { preHandler: [authenticateAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ success: true, data: readMenuConfig() });
    },
  );

  // PUT /admin/menu-config — saves new menu config (authenticated)
  server.put(
    '/menu-config',
    { preHandler: [authenticateAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const WebLinkSchema = z.object({
        id:      z.string(),
        label:   z.string().min(1),
        icon:    z.string(),
        href:    z.string(),
        target:  z.enum(['_self', '_blank']).default('_self'),
        visible: z.boolean().default(true),
        order:   z.number().int(),
        badge:   z.string().nullable().optional(),
      });
      const AdminLinkSchema = z.object({
        id:         z.string(),
        label:      z.string().min(1),
        icon:       z.string(),
        page:       z.string(),
        section:    z.string(),
        visible:    z.boolean().default(true),
        order:      z.number().int(),
        badge:      z.string().nullable().optional(),
        badgeClass: z.string().nullable().optional(),
      });
      const Body = z.object({
        web:   z.array(WebLinkSchema),
        admin: z.array(AdminLinkSchema),
      });

      const parsed = Body.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_BODY', message: parsed.error.message });
      }

      writeMenuConfig(parsed.data);
      return reply.send({ success: true });
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
