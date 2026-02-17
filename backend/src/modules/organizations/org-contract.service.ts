import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgContractService {
  constructor(private prisma: PrismaService) {}

  /**
   * اگر سازمان قراردادش منقضی شده باشد، خطا می‌دهد.
   * وقتی orgId صریح داریم (مثلاً از API key) استفاده می‌شود.
   */
  async ensureContractActive(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) return;
    if (org.contractEndsAt && new Date(org.contractEndsAt) < new Date()) {
      throw new ForbiddenException(
        'قرارداد سازمان منقضی شده است. لطفاً با پشتیبانی تماس بگیرید.',
      );
    }
  }

  /**
   * اگر کاربر عضو سازمانی با قرارداد منقضی باشد، کسر سکه انجام نمی‌شود.
   * قبل از هر deductCoins فراخوانی شود.
   */
  async ensureContractActiveForUser(userId: string): Promise<void> {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: { organization: true },
    });
    const now = new Date();
    for (const m of memberships) {
      const org = m.organization;
      if (org?.contractEndsAt && new Date(org.contractEndsAt) < now) {
        throw new ForbiddenException(
          `قرارداد سازمان «${org.name}» منقضی شده است. برای استفاده از سرویس، سازمان را ترک کنید یا قرارداد را تمدید کنید.`,
        );
      }
    }
  }

  /**
   * سقف سکه مؤثر برای کاربر در صورت عضویت در سازمان با customCoinQuota.
   * اگر سازمان سقف داشته باشد، حداقل (موجودی کاربر، سقف سازمان) برگردانده می‌شود.
   */
  async getEffectiveCoinCap(userId: string): Promise<number | null> {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: { organization: true },
    });
    let cap: number | null = null;
    for (const m of memberships) {
      const q = m.organization?.customCoinQuota;
      if (q != null && (cap == null || q < cap)) cap = q;
    }
    return cap;
  }

  /**
   * برای نمایش در UI: سقف سکه، تاریخ پایان قرارداد و نام سازمان (اولین سازمان دارای سقف یا قرارداد).
   */
  async getBillingContextForUser(userId: string): Promise<{
    effectiveCoinCap: number | null;
    contractEndsAt: string | null;
    organizationName: string | null;
  }> {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: { organization: true },
    });
    let effectiveCoinCap: number | null = null;
    let contractEndsAt: string | null = null;
    let organizationName: string | null = null;
    for (const m of memberships) {
      const org = m.organization;
      if (!org) continue;
      if (org.customCoinQuota != null && (effectiveCoinCap == null || org.customCoinQuota < effectiveCoinCap)) {
        effectiveCoinCap = org.customCoinQuota;
        if (!organizationName) organizationName = org.name;
      }
      if (org.contractEndsAt != null && (!contractEndsAt || new Date(org.contractEndsAt) > new Date(contractEndsAt))) {
        contractEndsAt = org.contractEndsAt.toISOString();
        if (!organizationName) organizationName = org.name;
      }
    }
    return { effectiveCoinCap, contractEndsAt, organizationName };
  }
}
