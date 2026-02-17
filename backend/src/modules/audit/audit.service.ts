import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  /** HTTP method for API audit (e.g. POST, GET) */
  method?: string;
  /** Request path for API audit (e.g. /api/v1/auth/login) */
  path?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          details: entry.details ? JSON.stringify(entry.details) : null,
          ip: entry.ip,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error}`);
    }
  }

  async getAuditLogs(options: {
    userId?: string;
    action?: string;
    entity?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const { userId, action, entity, from, to, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = from;
      if (to) (where.createdAt as Record<string, Date>).lte = to;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((l) => ({
        ...l,
        details: l.details ? JSON.parse(l.details) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** تعداد روز نگهداری لاگ (از تنظیمات؛ پیش‌فرض 90) */
  async getRetentionDays(): Promise<number> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'audit_retention_days' },
    });
    const days = setting?.value ? parseInt(setting.value, 10) : 90;
    return Number.isFinite(days) && days > 0 ? days : 90;
  }

  /** حذف لاگ‌های قدیمی‌تر از تعداد روز مشخص (یا طبق retention) */
  async purgeOldLogs(olderThanDays?: number): Promise<{ deleted: number }> {
    const days = olderThanDays ?? (await this.getRetentionDays());
    const before = new Date();
    before.setDate(before.getDate() - days);
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: before } },
    });
    this.logger.log(`Audit purge: deleted ${result.count} logs older than ${days} days`);
    return { deleted: result.count };
  }

  /** خروجی CSV برای بازه زمانی */
  async exportCsv(options: { from?: Date; to?: Date; limit?: number }): Promise<string> {
    const { from, to, limit = 10000 } = options;
    const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    const header = 'id,userId,action,entity,entityId,details,ip,createdAt\n';
    const rows = logs.map((l) => {
      const details = (l.details || '').replace(/"/g, '""');
      return `${l.id},${l.userId || ''},${l.action},${l.entity},${l.entityId || ''},"${details}",${l.ip || ''},${l.createdAt.toISOString()}`;
    });
    return '\uFEFF' + header + rows.join('\n');
  }

  /** خروجی JSON برای بازه زمانی (برای بایگانی و ممیزی) */
  async exportJson(options: { from?: Date; to?: Date; limit?: number }): Promise<Record<string, unknown>[]> {
    const { from, to, limit = 10000 } = options;
    const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      details: l.details ? JSON.parse(l.details) : null,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
