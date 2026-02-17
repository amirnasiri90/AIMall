import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(userId: string, options?: { from?: string; to?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true, role: true },
    });
    if (!user) return null;

    const now = new Date();
    const from = options?.from ? new Date(options.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = options?.to ? new Date(options.to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [conversationCount, recentConversations, recentTransactions, transactionsInRange] = await Promise.all([
      this.prisma.conversation.count({ where: { userId } }),
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: 'DEBIT',
          createdAt: { gte: from, lte: to },
        },
        select: { service: true, amount: true, createdAt: true },
      }),
    ]);

    const usageByService: Record<string, number> = {};
    for (const t of transactionsInRange) {
      const s = t.service || 'other';
      usageByService[s] = (usageByService[s] || 0) + t.amount;
    }
    const totalUsageInRange = transactionsInRange.reduce((sum, t) => sum + t.amount, 0);

    const dayMap: Record<string, number> = {};
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const t of transactionsInRange) {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (dayMap[key] !== undefined) dayMap[key] += t.amount;
    }
    const dailyUsage = Object.entries(dayMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      balance: { coins: user.coins },
      conversationCount,
      recentConversations: recentConversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
      usage: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        byService: usageByService,
        total: totalUsageInRange,
        daily: dailyUsage,
      },
      role: user.role,
    };
  }

  /** پرچم‌های نمایش منو (پایگاه دانش، ورکفلو، کارهای صف، مستندات API). پیش‌فرض: غیرفعال. */
  async getMenuFlags(): Promise<{ knowledge: boolean; workflows: boolean; jobs: boolean; developer: boolean }> {
    const keys = ['menu_knowledge_enabled', 'menu_workflows_enabled', 'menu_jobs_enabled', 'menu_developer_enabled'];
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value === 'true']));
    return {
      knowledge: map['menu_knowledge_enabled'] ?? false,
      workflows: map['menu_workflows_enabled'] ?? false,
      jobs: map['menu_jobs_enabled'] ?? false,
      developer: map['menu_developer_enabled'] ?? false,
    };
  }
}
