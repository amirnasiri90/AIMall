import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../billing/ledger.service';
import { AuditService } from '../audit/audit.service';
import { HealthCheckService } from '../providers/health-check.service';
import { SettingsService } from '../settings/settings.service';
import { AiProviderConfigService } from '../ai-providers/ai-provider-config.service';
import { ServiceMappingService, ServiceMappingPayload } from '../ai-providers/service-mapping.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private audit: AuditService,
    private healthCheck: HealthCheckService,
    private settings: SettingsService,
    private aiProviderConfig: AiProviderConfigService,
    private serviceMapping: ServiceMappingService,
  ) {}

  // ── Users ──

  async getUsers(options: {
    search?: string;
    page?: number;
    limit?: number;
    role?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { search, page = 1, limit = 20, role, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [{ email: { contains: search } }, { name: { contains: search } }];
    }
    if (role) where.role = role;

    const orderBy: any = {};
    if (['createdAt', 'email', 'name', 'coins', 'role'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, role: true, coins: true, createdAt: true },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adjustUserCoins(userId: string, amount: number, reason: string, adminId: string) {
    if (!reason) throw new BadRequestException('دلیل تغییر الزامی است');

    if (amount > 0) {
      await this.ledger.credit(userId, amount, reason, 'admin', undefined, 'admin', undefined, adminId);
    } else if (amount < 0) {
      await this.ledger.debit(userId, Math.abs(amount), reason, 'admin', 'admin', undefined, adminId);
    }

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_COIN_ADJUST',
      entity: 'User',
      entityId: userId,
      details: { amount, reason },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, coins: true },
    });
    return user;
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, coins: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return user;
  }

  async updateUser(
    userId: string,
    body: { name?: string; email?: string; role?: string; coins?: number; password?: string },
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    const data: { name?: string; email?: string; role?: string; coins?: number; password?: string } = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) {
      const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
      if (existing && existing.id !== userId) throw new BadRequestException('این ایمیل قبلاً ثبت شده');
      data.email = body.email;
    }
    if (body.role !== undefined) data.role = body.role;
    if (body.coins !== undefined) data.coins = Math.max(0, body.coins);
    if (body.password !== undefined && body.password.trim()) {
      const pwd = body.password.trim();
      if (pwd.length < 8) throw new BadRequestException('رمز عبور حداقل ۸ کاراکتر باشد');
      data.password = await bcrypt.hash(pwd, 10);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true, coins: true, createdAt: true, updatedAt: true },
    });
    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_USER_UPDATE',
      entity: 'User',
      entityId: userId,
      details: { updatedFields: Object.keys(data).filter((k) => k !== 'password') },
    });
    return updated;
  }

  // ── Pricing & Model Costs ──

  async getCoinPriceIRR() {
    return { coinPriceIRR: await this.settings.getCoinPriceIRR() };
  }

  async setCoinPriceIRR(value: number, adminId: string) {
    await this.settings.setCoinPriceIRR(value);
    await this.audit.log({
      userId: adminId,
      action: 'SETTING_UPDATE',
      entity: 'SystemSetting',
      entityId: 'coin_price_irr',
      details: { key: 'coin_price_irr', value: String(value) },
    });
    return { coinPriceIRR: value };
  }

  async getAllModelCosts() {
    const costs = await this.settings.getAllModelCosts();
    const coinPriceIRR = await this.settings.getCoinPriceIRR();
    return { coinPriceIRR, ...costs };
  }

  async setModelCosts(
    service: 'text' | 'image' | 'tts' | 'stt',
    costs: Record<string, number>,
    adminId: string,
  ) {
    await this.settings.setModelCosts(service, costs);
    await this.audit.log({
      userId: adminId,
      action: 'SETTING_UPDATE',
      entity: 'SystemSetting',
      entityId: `${service}_model_costs`,
      details: { key: `${service}_model_costs`, keysCount: Object.keys(costs).length },
    });
    return { [service]: costs };
  }

  // ── Coin Packages (Admin CRUD) ──

  async getPackagesAdmin() {
    return this.prisma.coinPackage.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createPackage(body: {
    name: string;
    coins: number;
    priceIRR: number;
    description?: string;
    packageType?: string;
    sortOrder?: number;
    discountPercent?: number;
    isActive?: boolean;
  }) {
    return this.prisma.coinPackage.create({
      data: {
        name: body.name,
        coins: body.coins,
        priceIRR: body.priceIRR,
        description: body.description ?? null,
        packageType: body.packageType ?? 'PERSONAL',
        sortOrder: body.sortOrder ?? 0,
        discountPercent: body.discountPercent ?? 0,
        isActive: body.isActive ?? true,
      },
    });
  }

  async updatePackage(
    id: string,
    body: {
      name?: string;
      coins?: number;
      priceIRR?: number;
      description?: string;
      packageType?: string;
      sortOrder?: number;
      discountPercent?: number;
      isActive?: boolean;
    },
  ) {
    const data: Parameters<typeof this.prisma.coinPackage.update>[0]['data'] = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.coins !== undefined) data.coins = body.coins;
    if (body.priceIRR !== undefined) data.priceIRR = body.priceIRR;
    if (body.description !== undefined) data.description = body.description;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.discountPercent !== undefined) data.discountPercent = body.discountPercent;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    // packageType: always apply when present (PERSONAL | ORGANIZATION)
    const packageTypeValue = body.packageType !== undefined && body.packageType !== null
      ? (body.packageType === 'ORGANIZATION' ? 'ORGANIZATION' : 'PERSONAL')
      : null;
    if (packageTypeValue !== null) {
      data.packageType = packageTypeValue;
    }
    const updated = await this.prisma.coinPackage.update({
      where: { id },
      data,
    });
    if (packageTypeValue !== null) {
      await this.prisma.$executeRaw(
        Prisma.sql`UPDATE "CoinPackage" SET "packageType" = ${packageTypeValue} WHERE id = ${id}`,
      );
    }
    return updated;
  }

  async setPackageType(id: string, packageType: 'PERSONAL' | 'ORGANIZATION') {
    const value = packageType === 'ORGANIZATION' ? 'ORGANIZATION' : 'PERSONAL';
    await this.prisma.$executeRaw(
      Prisma.sql`UPDATE "CoinPackage" SET "packageType" = ${value} WHERE id = ${id}`,
    );
    return this.prisma.coinPackage.findUnique({ where: { id } });
  }

  async deletePackage(id: string) {
    await this.prisma.coinPackage.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Discount Codes ──

  async getDiscountCodes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.discountCode.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.discountCode.count(),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createDiscountCode(body: {
    code: string;
    type?: 'PERCENT' | 'FIXED';
    value: number;
    minOrderIRR?: number;
    maxUses?: number;
    validFrom?: string;
    validTo?: string;
    isActive?: boolean;
  }) {
    const code = body.code.trim().toUpperCase();
    const existing = await this.prisma.discountCode.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('این کد قبلاً ثبت شده');
    return this.prisma.discountCode.create({
      data: {
        code,
        type: body.type ?? 'PERCENT',
        value: body.value,
        minOrderIRR: body.minOrderIRR ?? null,
        maxUses: body.maxUses ?? null,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validTo: body.validTo ? new Date(body.validTo) : null,
        isActive: body.isActive ?? true,
      },
    });
  }

  async updateDiscountCode(
    id: string,
    body: {
      code?: string;
      type?: string;
      value?: number;
      minOrderIRR?: number | null;
      maxUses?: number | null;
      validFrom?: string | null;
      validTo?: string | null;
      isActive?: boolean;
    },
  ) {
    const data: any = {};
    if (body.code !== undefined) data.code = body.code.trim().toUpperCase();
    if (body.type !== undefined) data.type = body.type;
    if (body.value !== undefined) data.value = body.value;
    if (body.minOrderIRR !== undefined) data.minOrderIRR = body.minOrderIRR;
    if (body.maxUses !== undefined) data.maxUses = body.maxUses;
    if (body.validFrom !== undefined) data.validFrom = body.validFrom ? new Date(body.validFrom) : null;
    if (body.validTo !== undefined) data.validTo = body.validTo ? new Date(body.validTo) : null;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.discountCode.update({
      where: { id },
      data,
    });
  }

  async deleteDiscountCode(id: string) {
    await this.prisma.discountCode.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Stats ──

  async getStats() {
    const [totalUsers, totalTransactions, revenueResult, todayStart] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        where: { type: 'CREDIT', category: 'payment' },
        _sum: { amount: true },
      }),
      Promise.resolve(new Date(new Date().setHours(0, 0, 0, 0))),
    ]);

    const [activeToday, totalCoinsInCirculation, totalGenerations] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { createdAt: { gte: todayStart } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.user.aggregate({ _sum: { coins: true } }),
      this.prisma.generation.count(),
    ]);

    return {
      totalUsers,
      totalTransactions,
      totalRevenue: revenueResult._sum.amount || 0,
      activeToday: activeToday.length,
      totalCoinsInCirculation: totalCoinsInCirculation._sum.coins || 0,
      totalGenerations,
    };
  }

  async getDailyStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: since } },
      select: { type: true, amount: true, service: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, {
      date: string;
      transactions: number;
      credits: number;
      debits: number;
      uniqueServices: Set<string>;
    }>();

    for (const tx of transactions) {
      const date = tx.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || {
        date,
        transactions: 0,
        credits: 0,
        debits: 0,
        uniqueServices: new Set<string>(),
      };
      existing.transactions++;
      if (tx.type === 'CREDIT') existing.credits += tx.amount;
      if (tx.type === 'DEBIT') existing.debits += tx.amount;
      if (tx.service) existing.uniqueServices.add(tx.service);
      dailyMap.set(date, existing);
    }

    return Array.from(dailyMap.values()).map((d) => ({
      date: d.date,
      transactions: d.transactions,
      credits: d.credits,
      debits: d.debits,
      services: d.uniqueServices.size,
    }));
  }

  async getServiceStats() {
    const transactions = await this.prisma.transaction.findMany({
      where: { type: 'DEBIT', service: { not: null } },
      select: { service: true, amount: true },
    });

    const serviceMap = new Map<string, { service: string; count: number; totalAmount: number }>();
    for (const tx of transactions) {
      const svc = tx.service || 'unknown';
      const existing = serviceMap.get(svc) || { service: svc, count: 0, totalAmount: 0 };
      existing.count++;
      existing.totalAmount += tx.amount;
      serviceMap.set(svc, existing);
    }

    return Array.from(serviceMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  async getRevenueStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const payments = await this.prisma.paymentOrder.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: since },
      },
      select: { priceIRR: true, coins: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyRevenue = new Map<string, { date: string; revenue: number; coins: number; orders: number }>();
    for (const p of payments) {
      const date = p.createdAt.toISOString().split('T')[0];
      const existing = dailyRevenue.get(date) || { date, revenue: 0, coins: 0, orders: 0 };
      existing.revenue += p.priceIRR;
      existing.coins += p.coins;
      existing.orders++;
      dailyRevenue.set(date, existing);
    }

    return Array.from(dailyRevenue.values());
  }

  // ── System Settings ──

  async getSettings(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async updateSetting(
    key: string,
    value: string,
    adminId: string,
    options?: { description?: string; category?: string },
  ) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    const oldValue = setting?.value;
    const updated = await this.prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        category: options?.category ?? 'general',
        description: options?.description ?? key,
      },
      update: { value },
    });

    await this.audit.log({
      userId: adminId,
      action: 'SETTING_UPDATE',
      entity: 'SystemSetting',
      entityId: updated.id,
      details: { key, oldValue, newValue: value },
    });

    return updated;
  }

  // ── Audit Logs ──

  async getAuditLogs(options: {
    userId?: string;
    action?: string;
    entity?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    return this.audit.getAuditLogs(options);
  }

  async getAuditRetentionDays(): Promise<number> {
    return this.audit.getRetentionDays();
  }

  async exportAuditLogsCsv(from?: Date, to?: Date, limit?: number): Promise<string> {
    return this.audit.exportCsv({ from, to, limit: limit ?? 10000 });
  }

  async exportAuditLogsJson(from?: Date, to?: Date, limit?: number) {
    return this.audit.exportJson({ from, to, limit: limit ?? 10000 });
  }

  async purgeAuditLogs(olderThanDays?: number): Promise<{ deleted: number }> {
    return this.audit.purgeOldLogs(olderThanDays);
  }

  // ── Organizations (Admin: list all + contract) ──

  async getOrganizations(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) where.name = { contains: search };
    const [orgs, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);
    return {
      organizations: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        plan: o.plan,
        customCoinQuota: o.customCoinQuota,
        contractEndsAt: o.contractEndsAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        membersCount: o._count.members,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateOrganizationContract(
    orgId: string,
    updates: { contractEndsAt?: string | null; customCoinQuota?: number | null; plan?: string },
    adminId: string,
  ) {
    const data: any = {};
    if (updates.contractEndsAt !== undefined) data.contractEndsAt = updates.contractEndsAt ? new Date(updates.contractEndsAt) : null;
    if (updates.customCoinQuota !== undefined) data.customCoinQuota = updates.customCoinQuota;
    if (updates.plan !== undefined) data.plan = updates.plan;
    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data,
    });
    this.audit.log({
      userId: adminId,
      action: 'ADMIN_ORG_CONTRACT_UPDATE',
      entity: 'Organization',
      entityId: orgId,
      details: updates,
    }).catch(() => {});
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      customCoinQuota: org.customCoinQuota,
      contractEndsAt: org.contractEndsAt?.toISOString() ?? null,
    };
  }

  // ── Provider Health ──

  getProvidersHealth() {
    return this.healthCheck.getHealthStatus();
  }

  async toggleProvider(providerId: string, enabled: boolean) {
    return this.healthCheck.setProviderEnabled(providerId, enabled);
  }

  // ── AI Providers (config + test) ──

  listAiProviders() {
    return this.aiProviderConfig.list();
  }

  getAiProvider(id: string) {
    return this.aiProviderConfig.get(id);
  }

  updateAiProvider(
    id: string,
    body: { displayName?: string; apiKey?: string; config?: object; isEnabled?: boolean },
  ) {
    return this.aiProviderConfig.update(id, body);
  }

  testAiProvider(id: string, apiKey?: string) {
    return this.aiProviderConfig.testConnection(id, apiKey);
  }

  getServiceMapping() {
    return this.serviceMapping.getMapping();
  }

  setServiceMapping(payload: ServiceMappingPayload) {
    return this.serviceMapping.setMapping(payload);
  }

  // ── Reconciliation ──

  async reconcileAll() {
    return this.ledger.reconcileAll();
  }

  // ── Export ──

  async exportUsersCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, coins: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'ID,Email,Name,Role,Coins,Created At';
    const rows = users.map(
      (u) =>
        `"${u.id}","${u.email}","${u.name || ''}","${u.role}",${u.coins},"${u.createdAt.toISOString()}"`,
    );

    return [header, ...rows].join('\n');
  }

  async exportTransactionsCsv(from?: Date, to?: Date): Promise<string> {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Safety limit
    });

    const header = 'ID,User Email,Type,Amount,Balance,Reason,Service,Category,Created At';
    const rows = transactions.map(
      (t) =>
        `"${t.id}","${t.user.email}","${t.type}",${t.amount},${t.balance},"${t.reason}","${t.service || ''}","${t.category}","${t.createdAt.toISOString()}"`,
    );

    return [header, ...rows].join('\n');
  }
}
