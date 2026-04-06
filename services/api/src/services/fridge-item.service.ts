import { PrismaClient, FridgeItemStatus, FridgeStorage, ExpiryType } from '@prisma/client';
import { estimateExpiryDays } from './food-recognition.service';
import { logger } from '../lib/logger';

export interface CreateFridgeItemInput {
  userId: string;
  familyGroupId?: string;
  name: string;
  quantity?: string;
  storageType?: 'fridge' | 'freezer';
  imageUrl?: string;
  captureImageUrl?: string;
  expirationDate?: Date;
  expiryType?: 'exact' | 'estimated';
  notes?: string;
  detectedFromImage?: boolean;
}

export interface UpdateFridgeItemInput {
  name?: string;
  quantity?: string;
  storageType?: 'fridge' | 'freezer';
  expirationDate?: Date;
  expiryType?: 'exact' | 'estimated';
  status?: FridgeItemStatus;
  notes?: string;
}

export interface FridgeListParams {
  page?: number;
  limit?: number;
  status?: FridgeItemStatus | 'all';
  storageType?: FridgeStorage;
  familyGroupId?: string;
  expiringWithinDays?: number;
}

// Status thresholds in days
const USE_SOON_THRESHOLD   = 7;
const EXPIRING_THRESHOLD   = 3;

export class FridgeItemService {
  constructor(private prisma: PrismaClient) {}

  // ─── Compute status from expiry date ──────────────────────────────────────
  private computeStatus(expirationDate: Date | null): FridgeItemStatus {
    if (!expirationDate) return 'fresh' as FridgeItemStatus;
    const now = new Date();
    const daysLeft = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft < 0) return 'expired' as FridgeItemStatus;
    if (daysLeft <= EXPIRING_THRESHOLD) return 'expiring_soon' as FridgeItemStatus;
    if (daysLeft <= USE_SOON_THRESHOLD) return 'use_soon' as FridgeItemStatus;
    return 'fresh' as FridgeItemStatus;
  }

  // ─── Bulk-refresh statuses (call periodically or on list) ─────────────────
  async refreshStatuses(userId: string): Promise<void> {
    const items = await this.prisma.fridgeItem.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { notIn: ['used', 'donated', 'discarded'] as FridgeItemStatus[] },
        expirationDate: { not: null },
      },
    });
    for (const item of items) {
      const newStatus = this.computeStatus(item.expirationDate);
      if (newStatus !== item.status) {
        await this.prisma.fridgeItem.update({
          where: { id: item.id },
          data: { status: newStatus },
        });
      }
    }
  }

  // ─── Create a single fridge item ──────────────────────────────────────────
  async create(input: CreateFridgeItemInput) {
    const storageType: FridgeStorage = (input.storageType ?? 'fridge') as FridgeStorage;

    // Estimate expiry if not provided
    let expirationDate = input.expirationDate;
    let expiryType: ExpiryType = (input.expiryType ?? 'estimated') as ExpiryType;

    if (!expirationDate) {
      const days = estimateExpiryDays(input.name, input.storageType ?? 'fridge');
      expirationDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      expiryType = 'estimated' as ExpiryType;
    }

    const status = this.computeStatus(expirationDate);

    const item = await this.prisma.fridgeItem.create({
      data: {
        userId:           input.userId,
        familyGroupId:    input.familyGroupId ?? null,
        name:             input.name,
        quantity:         input.quantity ?? null,
        storageType,
        imageUrl:         input.imageUrl ?? null,
        captureImageUrl:  input.captureImageUrl ?? null,
        expirationDate,
        expiryType,
        status,
        notes:            input.notes ?? null,
        detectedFromImage: input.detectedFromImage ?? false,
        reminderIds:      [],
      },
    });

    // Create reminders asynchronously (non-blocking)
    this.createExpiryReminders(item).catch(err =>
      logger.error({ err }, 'Failed to create fridge expiry reminders'),
    );

    return item;
  }

  // ─── Create multiple items from image detection ───────────────────────────
  async createBatch(inputs: CreateFridgeItemInput[]) {
    return Promise.all(inputs.map(i => this.create(i)));
  }

  // ─── List items ───────────────────────────────────────────────────────────
  async list(userId: string, params: FridgeListParams = {}) {
    const { page = 1, limit = 50, status, storageType, expiringWithinDays } = params;
    const skip = (page - 1) * limit;

    // Refresh statuses before listing
    await this.refreshStatuses(userId);

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (status && status !== 'all') {
      where.status = status;
    }
    if (storageType) {
      where.storageType = storageType;
    }
    if (expiringWithinDays !== undefined) {
      const cutoff = new Date(Date.now() + expiringWithinDays * 24 * 60 * 60 * 1000);
      where.expirationDate = { lte: cutoff, gt: new Date() };
    }

    const [data, total] = await Promise.all([
      this.prisma.fridgeItem.findMany({
        where,
        orderBy: [
          { expirationDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.fridgeItem.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Family shared fridge ─────────────────────────────────────────────────
  async listForFamily(familyGroupId: string, params: FridgeListParams = {}) {
    const { page = 1, limit = 50, status, storageType } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      familyGroupId,
      deletedAt: null,
    };
    if (status && status !== 'all') where.status = status;
    if (storageType) where.storageType = storageType;

    const [data, total] = await Promise.all([
      this.prisma.fridgeItem.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { expirationDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.fridgeItem.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Get single item ──────────────────────────────────────────────────────
  async findById(id: string, userId: string) {
    const item = await this.prisma.fridgeItem.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!item) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Fridge item not found' };
    return item;
  }

  // ─── Update item ──────────────────────────────────────────────────────────
  async update(id: string, userId: string, input: UpdateFridgeItemInput) {
    await this.findById(id, userId); // ownership check

    const data: any = { ...input };

    // If expiry date changes, recompute status unless status is explicitly set
    if (input.expirationDate && !input.status) {
      data.status = this.computeStatus(input.expirationDate);
    }

    return this.prisma.fridgeItem.update({
      where: { id },
      data,
    });
  }

  // ─── Mark item status ─────────────────────────────────────────────────────
  async markStatus(id: string, userId: string, status: FridgeItemStatus) {
    await this.findById(id, userId);
    return this.prisma.fridgeItem.update({
      where: { id },
      data: { status },
    });
  }

  // ─── Move between fridge / freezer ───────────────────────────────────────
  async move(id: string, userId: string, to: 'fridge' | 'freezer') {
    const item = await this.findById(id, userId);
    const storageType = to as FridgeStorage;

    // Re-estimate expiry when moving to freezer
    const expirationDate = item.expiryType === 'estimated'
      ? new Date(Date.now() + estimateExpiryDays(item.name, to) * 24 * 60 * 60 * 1000)
      : item.expirationDate;

    const status = this.computeStatus(expirationDate);

    return this.prisma.fridgeItem.update({
      where: { id },
      data: { storageType, expirationDate, status },
    });
  }

  // ─── Update image url ─────────────────────────────────────────────────────
  async setImageUrl(id: string, userId: string, imageUrl: string) {
    await this.findById(id, userId);
    return this.prisma.fridgeItem.update({ where: { id }, data: { imageUrl } });
  }

  // ─── Soft delete ─────────────────────────────────────────────────────────
  async softDelete(id: string, userId: string) {
    await this.findById(id, userId);
    return this.prisma.fridgeItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Summary stats ────────────────────────────────────────────────────────
  async stats(userId: string) {
    await this.refreshStatuses(userId);
    const counts = await this.prisma.fridgeItem.groupBy({
      by: ['status'],
      where: { userId, deletedAt: null },
      _count: true,
    });
    const result: Record<string, number> = {
      total: 0, fresh: 0, use_soon: 0, expiring_soon: 0, expired: 0,
      donated: 0, used: 0, discarded: 0,
    };
    for (const row of counts) {
      result[row.status] = row._count;
      result.total += row._count;
    }
    return result;
  }

  // ─── Auto-create expiry reminders ────────────────────────────────────────
  private async createExpiryReminders(item: any): Promise<void> {
    if (!item.expirationDate) return;

    const expiryDate = new Date(item.expirationDate);
    const now = new Date();
    const reminderDays = [7, 3, 1, 0]; // days before expiry
    const createdIds: string[] = [];

    for (const days of reminderDays) {
      const fireAt = new Date(expiryDate.getTime() - days * 24 * 60 * 60 * 1000);
      if (fireAt <= now) continue; // skip past dates

      const title =
        days === 0
          ? `🧊 "${item.name}" expires today — use, donate or discard`
          : days === 1
          ? `🧊 "${item.name}" expires tomorrow`
          : `🧊 "${item.name}" expires in ${days} days`;

      try {
        const reminder = await this.prisma.reminder.create({
          data: {
            userId:   item.userId,
            type:     'task',
            title,
            fireAt,
            status:   'pending',
            priority: days <= 1 ? 'high' : 'medium',
            notes:    `Auto-generated for fridge item: ${item.name} (${item.storageType}). Expires: ${expiryDate.toLocaleDateString()}.`,
          },
        });
        createdIds.push(reminder.id);
      } catch (err) {
        logger.warn({ err }, 'Could not create fridge reminder');
      }
    }

    if (createdIds.length > 0) {
      await this.prisma.fridgeItem.update({
        where: { id: item.id },
        data: { reminderIds: createdIds },
      });
    }
  }

  // ─── Notify family members ────────────────────────────────────────────────
  async notifyFamily(itemId: string, userId: string): Promise<{ notified: number }> {
    const item = await this.findById(itemId, userId);
    if (!item.familyGroupId) return { notified: 0 };

    const family = await this.prisma.family.findUnique({
      where: { id: item.familyGroupId },
      include: {
        members: {
          include: {
            user: {
              include: { pushDeviceTokens: true },
            },
          },
        },
      },
    });
    if (!family) return { notified: 0 };

    const otherMembers = family.members.filter(m => m.userId !== userId);
    let notified = 0;

    const expiryLabel = item.expirationDate
      ? `Expires ${new Date(item.expirationDate).toLocaleDateString()}`
      : 'No expiry date set';

    for (const member of otherMembers) {
      const tokens = member.user.pushDeviceTokens ?? [];
      for (const deviceToken of tokens) {
        try {
          // Use existing notification log system
          await this.prisma.notificationLog.create({
            data: {
              userId:   member.userId,
              type:     'push',
              title:    `🧊 ${item.name} added to family fridge`,
              body:     `${item.quantity ? item.quantity + ' of ' : ''}${item.name} in ${item.storageType}. ${expiryLabel}.`,
              status:   'sent',
              metadata: { fridgeItemId: item.id, token: deviceToken.token },
            },
          });
          notified++;
        } catch {
          // non-critical
        }
      }
    }

    return { notified };
  }
}
