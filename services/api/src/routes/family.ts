import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';

export async function familyRoutes(server: FastifyInstance) {

  // ── POST /v1/family — create a family (family plan required)
  server.post('/', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const body = z.object({
      name:     z.string().min(1).max(100),
      avatarUrl: z.string().url().optional(),
    }).parse(request.body);

    // Check user isn't already in a family
    const existing = await server.prisma.familyMember.findFirst({ where: { userId } });
    if (existing) {
      return reply.status(409).send({ error: 'CONFLICT', message: 'You are already a member of a family.' });
    }

    const family = await server.prisma.family.create({
      data: {
        name:     body.name,
        avatarUrl: body.avatarUrl,
        ownerId:  userId,
        members: {
          create: { userId, role: 'owner' },
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } } },
    });

    // Update user plan to family if not already
    await server.prisma.user.update({ where: { id: userId }, data: { plan: 'family' } });

    return reply.status(201).send({ success: true, data: family });
  });

  // ── GET /v1/family/me — get my family + members
  server.get('/me', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;

    const membership = await server.prisma.familyMember.findFirst({
      where: { userId },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true, plan: true } },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'You are not part of a family yet.' });
    }

    return reply.send({ success: true, data: membership.family });
  });

  // ── PATCH /v1/family/me — update family name/avatar
  server.patch('/me', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const body = z.object({
      name:     z.string().min(1).max(100).optional(),
      avatarUrl: z.string().url().optional(),
    }).parse(request.body);

    const membership = await server.prisma.familyMember.findFirst({ where: { userId } });
    if (!membership) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Family not found.' });

    const family = await server.prisma.family.findUnique({ where: { id: membership.familyId } });
    if (!family || family.ownerId !== userId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only the family owner can update settings.' });
    }

    const updated = await server.prisma.family.update({
      where: { id: family.id },
      data:  body,
    });

    return reply.send({ success: true, data: updated });
  });

  // ── POST /v1/family/invite — send invite to a family member
  server.post('/invite', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const body = z.object({
      email: z.string().email(),
      role:  z.enum(['adult', 'child']).default('adult'),
    }).parse(request.body);

    const membership = await server.prisma.familyMember.findFirst({ where: { userId } });
    if (!membership) return reply.status(404).send({ error: 'NOT_FOUND', message: 'You are not part of a family.' });

    const family = await server.prisma.family.findUnique({ where: { id: membership.familyId } });
    if (!family || family.ownerId !== userId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only the family owner can send invites.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Revoke any existing pending invite for this email+family
    await server.prisma.familyInvite.updateMany({
      where: { familyId: family.id, email: body.email.toLowerCase(), status: 'pending' },
      data:  { status: 'expired' },
    });

    await server.prisma.familyInvite.create({
      data: {
        familyId:  family.id,
        email:     body.email.toLowerCase(),
        tokenHash,
        role:      body.role,
        expiresAt,
      },
    });

    // TODO: send invite email with rawToken
    return reply.status(201).send({
      success: true,
      data: {
        message: `Invite sent to ${body.email}`,
        // In dev: expose token for testing
        inviteToken: rawToken,
      },
    });
  });

  // ── POST /v1/family/invite/accept — accept a family invite
  server.post('/invite/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = z.object({ token: z.string().min(1) }).parse(request.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = await server.prisma.familyInvite.findUnique({
      where: { tokenHash },
      include: { family: true },
    });

    if (!invite || invite.status !== 'pending' || invite.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'INVALID_TOKEN', message: 'Invite link is invalid or has expired.' });
    }

    // Find or require logged-in user matching invite email
    const user = await server.prisma.user.findUnique({ where: { email: invite.email } });
    if (!user) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'No account found for this email. Please register first.' });
    }

    // Check not already in a family
    const alreadyMember = await server.prisma.familyMember.findFirst({ where: { userId: user.id } });
    if (alreadyMember) {
      return reply.status(409).send({ error: 'CONFLICT', message: 'This user is already a member of a family.' });
    }

    await server.prisma.$transaction([
      server.prisma.familyMember.create({
        data: { familyId: invite.familyId, userId: user.id, role: invite.role },
      }),
      server.prisma.familyInvite.update({
        where: { id: invite.id },
        data:  { status: 'accepted' },
      }),
      server.prisma.user.update({
        where: { id: user.id },
        data:  { plan: 'family' },
      }),
    ]);

    return reply.send({ success: true, data: { familyId: invite.familyId, familyName: invite.family.name } });
  });

  // ── DELETE /v1/family/members/:userId — remove a family member
  server.delete('/members/:memberId', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { memberId } = request.params as { memberId: string };

    const membership = await server.prisma.familyMember.findFirst({ where: { userId } });
    if (!membership) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Family not found.' });

    const family = await server.prisma.family.findUnique({ where: { id: membership.familyId } });
    if (!family) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Family not found.' });

    // Owner can remove anyone; members can only remove themselves
    if (family.ownerId !== userId && userId !== memberId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'You cannot remove other members.' });
    }
    if (memberId === family.ownerId) {
      return reply.status(400).send({ error: 'INVALID_OPERATION', message: 'Owner cannot be removed. Transfer ownership first.' });
    }

    await server.prisma.familyMember.delete({
      where: { familyId_userId: { familyId: family.id, userId: memberId } },
    });

    return reply.status(204).send();
  });

  // ── GET /v1/family/reminders — shared family reminders
  server.get('/reminders', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const query = z.object({
      page:   z.coerce.number().int().positive().default(1),
      limit:  z.coerce.number().int().positive().max(100).default(20),
      status: z.enum(['pending', 'completed', 'snoozed', 'deleted']).optional(),
    }).parse(request.query);

    const membership = await server.prisma.familyMember.findFirst({ where: { userId } });
    if (!membership) return reply.status(404).send({ error: 'NOT_FOUND', message: 'You are not part of a family.' });

    const where: any = {
      familyId:   membership.familyId,
      shareScope: { not: 'private' },
      deletedAt:  null,
    };
    if (query.status) where.status = query.status;

    const skip = (query.page - 1) * query.limit;
    const [reminders, total] = await Promise.all([
      server.prisma.reminder.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { fireAt: 'asc' },
        include: {
          user:     { select: { id: true, name: true, avatarUrl: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          shares:   { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        },
      }),
      server.prisma.reminder.count({ where }),
    ]);

    return reply.send({ success: true, data: reminders, total, page: query.page, limit: query.limit });
  });

  // ── POST /v1/family/reminders — create a family-shared reminder
  server.post('/reminders', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const body = z.object({
      title:      z.string().min(1).max(255),
      type:       z.enum(['call', 'task', 'email', 'location', 'event']).default('task'),
      fireAt:     z.coerce.date(),
      priority:   z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      notes:      z.string().optional(),
      shareScope: z.enum(['family', 'specific']).default('family'),
      assigneeId: z.string().uuid().optional(),
      shareWith:  z.array(z.string().uuid()).optional(), // specific member user IDs
    }).parse(request.body);

    const membership = await server.prisma.familyMember.findFirst({ where: { userId } });
    if (!membership) return reply.status(403).send({ error: 'FORBIDDEN', message: 'Family plan required.' });

    const reminder = await server.prisma.reminder.create({
      data: {
        userId,
        familyId:   membership.familyId,
        title:      body.title,
        type:       body.type,
        fireAt:     body.fireAt,
        priority:   body.priority,
        notes:      body.notes,
        shareScope: body.shareScope,
        assigneeId: body.assigneeId,
        shares: body.shareScope === 'specific' && body.shareWith?.length
          ? { create: body.shareWith.map(uid => ({ userId: uid })) }
          : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        shares:   { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });

    return reply.status(201).send({ success: true, data: reminder });
  });
}
