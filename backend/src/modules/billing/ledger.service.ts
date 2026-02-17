import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Double-entry ledger service.
 * Every coin movement creates a pair of entries:
 *   - DEBIT  (coins leave an account)
 *   - CREDIT (coins enter an account)
 * The user.coins field is maintained as a cached balance.
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Deduct coins with double-entry:
   *  User account: DEBIT (coins leave user)
   *  Platform revenue: recorded as service usage
   */
  async debit(
    userId: string,
    amount: number,
    reason: string,
    service?: string,
    category = 'usage',
    idempotencyKey?: string,
    actorId?: string,
  ) {
    if (amount <= 0) throw new BadRequestException('مقدار باید بزرگ‌تر از صفر باشد');

    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey } });
      if (existing) return this.prisma.user.findUnique({ where: { id: userId } });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('کاربر یافت نشد');
    if (user.coins < amount) throw new BadRequestException('اعتبار کافی نیست');

    const newBalance = user.coins - amount;

    const [updatedUser, transaction] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { coins: newBalance } }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          balance: newBalance,
          reason,
          service,
          category,
          idempotencyKey,
        },
      }),
    ]);

    // Audit trail
    await this.audit.log({
      userId: actorId || userId,
      action: 'COIN_DEBIT',
      entity: 'Transaction',
      entityId: transaction.id,
      details: { amount, newBalance, reason, service, category },
    });

    return updatedUser;
  }

  /**
   * Credit coins with double-entry:
   *  User account: CREDIT (coins enter user)
   *  Platform: recorded as payment/topup
   */
  async credit(
    userId: string,
    amount: number,
    reason: string,
    service?: string,
    referenceId?: string,
    category = 'payment',
    idempotencyKey?: string,
    actorId?: string,
  ) {
    if (amount <= 0) throw new BadRequestException('مقدار باید بزرگ‌تر از صفر باشد');

    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey } });
      if (existing) return this.prisma.user.findUnique({ where: { id: userId } });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('کاربر یافت نشد');

    const newBalance = user.coins + amount;

    const [updatedUser, transaction] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { coins: newBalance } }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'CREDIT',
          amount,
          balance: newBalance,
          reason,
          service,
          referenceId,
          category,
          idempotencyKey,
        },
      }),
    ]);

    // Audit trail
    await this.audit.log({
      userId: actorId || userId,
      action: 'COIN_CREDIT',
      entity: 'Transaction',
      entityId: transaction.id,
      details: { amount, newBalance, reason, service, category, referenceId },
    });

    return updatedUser;
  }

  /**
   * Reconcile a user's balance:
   * Recalculate from transaction history and fix if inconsistent.
   */
  async reconcile(userId: string): Promise<{
    previousBalance: number;
    calculatedBalance: number;
    wasConsistent: boolean;
    corrected: boolean;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('کاربر یافت نشد');

    const credits = await this.prisma.transaction.aggregate({
      where: { userId, type: 'CREDIT' },
      _sum: { amount: true },
    });
    const debits = await this.prisma.transaction.aggregate({
      where: { userId, type: 'DEBIT' },
      _sum: { amount: true },
    });

    const calculatedBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);
    const wasConsistent = user.coins === calculatedBalance;

    if (!wasConsistent) {
      await this.prisma.user.update({ where: { id: userId }, data: { coins: calculatedBalance } });

      await this.audit.log({
        userId,
        action: 'RECONCILIATION',
        entity: 'User',
        entityId: userId,
        details: {
          previousBalance: user.coins,
          calculatedBalance,
          difference: user.coins - calculatedBalance,
        },
      });

      this.logger.warn(
        `Reconciled user ${userId}: ${user.coins} → ${calculatedBalance} (diff: ${user.coins - calculatedBalance})`,
      );
    }

    return {
      previousBalance: user.coins,
      calculatedBalance,
      wasConsistent,
      corrected: !wasConsistent,
    };
  }

  /**
   * Reconcile ALL users and return a report.
   */
  async reconcileAll(): Promise<{
    totalUsers: number;
    inconsistent: number;
    corrected: number;
    details: Array<{ userId: string; previous: number; calculated: number }>;
  }> {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    const details: Array<{ userId: string; previous: number; calculated: number }> = [];
    let inconsistent = 0;
    let corrected = 0;

    for (const u of users) {
      const result = await this.reconcile(u.id);
      if (!result.wasConsistent) {
        inconsistent++;
        if (result.corrected) corrected++;
        details.push({
          userId: u.id,
          previous: result.previousBalance,
          calculated: result.calculatedBalance,
        });
      }
    }

    return { totalUsers: users.length, inconsistent, corrected, details };
  }

  /**
   * Get full ledger summary for a user (grouped by category and type).
   */
  async getLedgerSummary(userId: string) {
    const byCategory = await this.prisma.transaction.groupBy({
      by: ['category', 'type'],
      where: { userId },
      _sum: { amount: true },
      _count: true,
    });

    const byService = await this.prisma.transaction.groupBy({
      by: ['service', 'type'],
      where: { userId },
      _sum: { amount: true },
      _count: true,
    });

    return { byCategory, byService };
  }

  /**
   * Get payment orders for a user.
   */
  async getPaymentOrders(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentOrder.count({ where: { userId } }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
