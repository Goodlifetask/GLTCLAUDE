import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient, User } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { AuthTokens, JWTPayload } from '@glt/shared';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

const BCRYPT_ROUNDS = 12;

interface RegisterInput {
  email:    string;
  password: string;
  name:     string;
}

interface LoginInput {
  email:    string;
  password: string;
}

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private server: FastifyInstance,
  ) {}

  async register(input: RegisterInput): Promise<{ user: User; tokens: AuthTokens }> {
    // Check duplicate email
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existing) {
      const err = new Error('Email already registered') as Error & { statusCode: number; code: string };
      err.statusCode = 409;
      err.code = 'CONFLICT';
      throw err;
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email:        input.email.toLowerCase().trim(),
        name:         input.name.trim(),
        passwordHash,
        plan:         'free',
        locale:       'en',
        timezone:     'UTC',
        theme:        'warm_corporate',
      },
    });

    // Create default system lists
    await this.createSystemLists(user.id);

    // Create initial free subscription record
    await this.prisma.subscription.create({
      data: {
        userId: user.id,
        plan:   'free',
        status: 'active',
      },
    });

    const tokens = await this.issueTokens(user);
    logger.info({ userId: user.id }, 'User registered');
    return { user, tokens };
  }

  async login(input: LoginInput): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!user || !user.passwordHash) {
      // Timing-safe: hash empty string to prevent enumeration
      await bcrypt.hash('dummy', BCRYPT_ROUNDS);
      const err = new Error('Invalid credentials') as Error & { statusCode: number; code: string };
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    if (!user.isActive) {
      const err = new Error('Account is deactivated') as Error & { statusCode: number; code: string };
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      const err = new Error('Invalid credentials') as Error & { statusCode: number; code: string };
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user);
    logger.info({ userId: user.id }, 'User logged in');
    return { user, tokens };
  }

  async refreshToken(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      const err = new Error('Invalid or expired refresh token') as Error & { statusCode: number; code: string };
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    if (!stored.user.isActive) {
      const err = new Error('Account is deactivated') as Error & { statusCode: number; code: string };
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data:  { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data:  { revokedAt: new Date() },
    });
  }

  async sendMagicLink(email: string): Promise<void> {
    // Always return 202 (never reveal if email exists)
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) return; // silently skip

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Store in Redis with 15-min TTL
    await (this.server as any).redis.setex(
      `magic:${tokenHash}`,
      900,
      user.id,
    );

    // TODO: Queue email via BullMQ
    logger.info({ userId: user.id, email }, 'Magic link generated (email queued)');
  }

  // ─── Password Reset (self-service) ───────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    // Always return silently — never reveal whether the email exists
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user || !user.isActive) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken:   tokenHash,
        passwordResetExpires: expires,
      },
    });

    // TODO: send actual email with reset URL containing rawToken
    logger.info({ userId: user.id, email }, `Password reset token generated (token: ${rawToken})`);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken:   tokenHash,
        passwordResetExpires: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      const err = new Error('Password reset link is invalid or has expired') as Error & { statusCode: number; code: string };
      err.statusCode = 400;
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken:   null,
        passwordResetExpires: null,
      },
    });

    // Revoke all existing refresh tokens so old sessions are invalidated
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data:  { revokedAt: new Date() },
    });

    logger.info({ userId: user.id }, 'Password reset completed');
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.passwordHash) {
      const err = new Error('Cannot change password for this account') as Error & { statusCode: number; code: string };
      err.statusCode = 400;
      err.code = 'INVALID_OPERATION';
      throw err;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      const err = new Error('Current password is incorrect') as Error & { statusCode: number; code: string };
      err.statusCode = 400;
      err.code = 'INVALID_PASSWORD';
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data:  { passwordHash },
    });

    logger.info({ userId }, 'Password changed');
  }

  async verifyMagicLink(token: string): Promise<{ user: User; tokens: AuthTokens }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const redis = (this.server as any).redis;

    const userId = await redis.get(`magic:${tokenHash}`);
    if (!userId) {
      const err = new Error('Magic link expired or invalid') as Error & { statusCode: number; code: string };
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    await redis.del(`magic:${tokenHash}`);

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user);
    logger.info({ userId: user.id }, 'Magic link login');
    return { user, tokens };
  }

  // ─── Private ──────────────────────────────────────────────────────

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JWTPayload = {
      sub:   user.id,
      email: user.email,
      plan:  user.plan as any,
      iat:   Math.floor(Date.now() / 1000),
      exp:   Math.floor(Date.now() / 1000) + env.ACCESS_TOKEN_TTL,
      iss:   env.JWT_ISSUER,
      aud:   env.JWT_AUDIENCE,
    };

    const accessToken = this.server.jwt.sign(payload as object);

    // Generate opaque refresh token
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId:    user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn:    env.ACCESS_TOKEN_TTL,
    };
  }

  private async createSystemLists(userId: string): Promise<void> {
    const systemLists = [
      { name: 'Work',      color: '#3F8EFC', icon: 'briefcase'  },
      { name: 'Personal',  color: '#F0A202', icon: 'person'     },
      { name: 'Health',    color: '#2ECC71', icon: 'heart'      },
      { name: 'Finance',   color: '#F59E0B', icon: 'dollar'     },
      { name: 'Family',    color: '#EC4899', icon: 'home'       },
      { name: 'Travel',    color: '#8B5CF6', icon: 'airplane'   },
      { name: 'Shopping',  color: '#EF4444', icon: 'cart'       },
      { name: 'Education', color: '#06B6D4', icon: 'book'       },
    ];

    await this.prisma.reminderList.createMany({
      data: systemLists.map((list) => ({ userId, ...list, isSystem: true })),
      skipDuplicates: true,
    });
  }
}
