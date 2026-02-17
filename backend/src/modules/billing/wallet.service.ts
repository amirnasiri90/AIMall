import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const credits = await this.prisma.transaction.aggregate({
      where: { userId, type: 'CREDIT' },
      _sum: { amount: true },
    });
    const debits = await this.prisma.transaction.aggregate({
      where: { userId, type: 'DEBIT' },
      _sum: { amount: true },
    });

    const calculatedBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);

    return {
      coins: user?.coins || 0,
      calculatedBalance,
      isConsistent: user?.coins === calculatedBalance,
      totalCredits: credits._sum.amount || 0,
      totalDebits: debits._sum.amount || 0,
    };
  }

  async getTransactions(userId: string, page = 1, limit = 20, category?: string) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (category) where.category = category;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async reconcile(userId: string) {
    const credits = await this.prisma.transaction.aggregate({
      where: { userId, type: 'CREDIT' },
      _sum: { amount: true },
    });
    const debits = await this.prisma.transaction.aggregate({
      where: { userId, type: 'DEBIT' },
      _sum: { amount: true },
    });
    const balance = (credits._sum.amount || 0) - (debits._sum.amount || 0);

    await this.prisma.user.update({ where: { id: userId }, data: { coins: balance } });
    return balance;
  }

  async getLedgerSummary(userId: string) {
    const byCategory = await this.prisma.transaction.groupBy({
      by: ['category', 'type'],
      where: { userId },
      _sum: { amount: true },
      _count: true,
    });
    return byCategory;
  }
}
