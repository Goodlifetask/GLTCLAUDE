import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';

export async function teamRoutes(server: FastifyInstance) {

  // ── POST /v1/team/workspaces — create a workspace
  server.post('/workspaces', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const body = z.object({
      name:        z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      avatarUrl:   z.string().url().optional(),
    }).parse(request.body);

    const workspace = await server.prisma.teamWorkspace.create({
      data: {
        name:        body.name,
        description: body.description,
        avatarUrl:   body.avatarUrl,
        ownerId:     userId,
        members: {
          create: { userId, role: 'owner' },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        projects: true,
      },
    });

    await server.prisma.user.update({ where: { id: userId }, data: { plan: 'team' } });

    return reply.status(201).send({ success: true, data: workspace });
  });

  // ── GET /v1/team/workspaces — list my workspaces
  server.get('/workspaces', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;

    const memberships = await server.prisma.teamMembership.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
            projects: { where: { isArchived: false } },
            _count: { select: { reminders: true, members: true } },
          },
        },
      },
    });

    return reply.send({ success: true, data: memberships.map(m => ({ ...m.workspace, myRole: m.role })) });
  });

  // ── GET /v1/team/workspaces/:id — get single workspace
  server.get('/workspaces/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };

    const membership = await server.prisma.teamMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership) return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member of this workspace.' });

    const workspace = await server.prisma.teamWorkspace.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        projects: { orderBy: { createdAt: 'asc' } },
        _count: { select: { reminders: true } },
      },
    });

    return reply.send({ success: true, data: { ...workspace, myRole: membership.role } });
  });

  // ── PATCH /v1/team/workspaces/:id — update workspace
  server.patch('/workspaces/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };
    const body = z.object({
      name:        z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      avatarUrl:   z.string().url().optional(),
    }).parse(request.body);

    const workspace = await server.prisma.teamWorkspace.findUnique({ where: { id } });
    if (!workspace || workspace.ownerId !== userId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only the workspace owner can update settings.' });
    }

    const updated = await server.prisma.teamWorkspace.update({ where: { id }, data: body });
    return reply.send({ success: true, data: updated });
  });

  // ── POST /v1/team/workspaces/:id/invite — invite a member
  server.post('/workspaces/:id/invite', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };
    const body = z.object({
      email: z.string().email(),
      role:  z.enum(['admin', 'member']).default('member'),
    }).parse(request.body);

    const membership = await server.prisma.teamMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only owners and admins can invite members.' });
    }

    // If user already exists, add directly
    const invitee = await server.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (invitee) {
      const already = await server.prisma.teamMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId: invitee.id } },
      });
      if (already) return reply.status(409).send({ error: 'CONFLICT', message: 'User is already a workspace member.' });

      await server.prisma.teamMembership.create({
        data: { workspaceId: id, userId: invitee.id, role: body.role },
      });
      await server.prisma.user.update({ where: { id: invitee.id }, data: { plan: 'team' } });
      return reply.send({ success: true, data: { message: `${invitee.name} added to workspace.`, added: true } });
    }

    // Otherwise store a pending invite token (future: send email)
    const rawToken = crypto.randomBytes(32).toString('hex');
    return reply.status(201).send({
      success: true,
      data: { message: `Invite link generated for ${body.email}`, inviteToken: rawToken },
    });
  });

  // ── DELETE /v1/team/workspaces/:id/members/:memberId — remove member
  server.delete('/workspaces/:id/members/:memberId', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id, memberId } = request.params as { id: string; memberId: string };

    const myMembership = await server.prisma.teamMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Insufficient permissions.' });
    }

    const workspace = await server.prisma.teamWorkspace.findUnique({ where: { id } });
    if (memberId === workspace?.ownerId) {
      return reply.status(400).send({ error: 'INVALID_OPERATION', message: 'Cannot remove the workspace owner.' });
    }

    await server.prisma.teamMembership.delete({
      where: { workspaceId_userId: { workspaceId: id, userId: memberId } },
    });

    return reply.status(204).send();
  });

  // ── POST /v1/team/workspaces/:id/projects — create a project
  server.post('/workspaces/:id/projects', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };
    const body = z.object({
      name:        z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
      icon:        z.string().default('folder'),
      dueDate:     z.string().datetime().optional(),
    }).parse(request.body);

    const membership = await server.prisma.teamMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership) return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member of this workspace.' });

    const project = await server.prisma.teamProject.create({
      data: {
        workspaceId: id,
        name:        body.name,
        description: body.description,
        color:       body.color,
        icon:        body.icon,
        dueDate:     body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    return reply.status(201).send({ success: true, data: project });
  });

  // ── GET /v1/team/workspaces/:id/projects — list projects
  server.get('/workspaces/:id/projects', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };

    const membership = await server.prisma.teamMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership) return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member.' });

    const projects = await server.prisma.teamProject.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { reminders: true } } },
    });

    return reply.send({ success: true, data: projects });
  });

  // ── PATCH /v1/team/workspaces/:id/projects/:projectId — update project
  server.patch('/workspaces/:id/projects/:projectId', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id, projectId } = request.params as { id: string; projectId: string };
    const body = z.object({
      name:        z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      isArchived:  z.boolean().optional(),
      dueDate:     z.string().datetime().optional(),
    }).parse(request.body);

    const membership = await server.prisma.teamMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership || membership.role === 'member') {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only admins and owners can edit projects.' });
    }

    const project = await server.prisma.teamProject.update({
      where: { id: projectId },
      data: {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    return reply.send({ success: true, data: project });
  });

  // ── GET /v1/team/workspaces/:id/reminders — all workspace tasks
  server.get('/workspaces/:id/reminders', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };
    const query = z.object({
      page:      z.coerce.number().int().positive().default(1),
      limit:     z.coerce.number().int().positive().max(100).default(50),
      projectId: z.string().uuid().optional(),
      assigneeId: z.string().uuid().optional(),
      status:    z.enum(['pending', 'completed', 'snoozed', 'deleted']).optional(),
    }).parse(request.query);

    const membership = await server.prisma.teamMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership) return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member.' });

    const where: any = { workspaceId: id, deletedAt: null };
    if (query.projectId)  where.projectId  = query.projectId;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.status)     where.status     = query.status;

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
          project:  { select: { id: true, name: true, color: true, icon: true } },
        },
      }),
      server.prisma.reminder.count({ where }),
    ]);

    return reply.send({ success: true, data: reminders, total, page: query.page, limit: query.limit });
  });

  // ── POST /v1/team/workspaces/:id/reminders — create a workspace task
  server.post('/workspaces/:id/reminders', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };
    const body = z.object({
      title:      z.string().min(1).max(255),
      type:       z.enum(['call', 'task', 'email', 'location', 'event']).default('task'),
      fireAt:     z.string().datetime(),
      priority:   z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      notes:      z.string().optional(),
      projectId:  z.string().uuid().optional(),
      assigneeId: z.string().uuid().optional(),
    }).parse(request.body);

    const membership = await server.prisma.teamMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership) return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member.' });

    const reminder = await server.prisma.reminder.create({
      data: {
        userId,
        workspaceId: id,
        projectId:   body.projectId,
        assigneeId:  body.assigneeId,
        title:       body.title,
        type:        body.type,
        fireAt:      new Date(body.fireAt),
        priority:    body.priority,
        notes:       body.notes,
        shareScope:  'team',
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        project:  { select: { id: true, name: true, color: true } },
      },
    });

    return reply.status(201).send({ success: true, data: reminder });
  });
}
