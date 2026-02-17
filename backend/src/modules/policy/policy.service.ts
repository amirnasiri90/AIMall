import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** خروجی مسیریابی بر اساس سیاست (سازمان / کاربر) */
export interface RoutingPolicy {
  /** شناسه provider ترجیحی (مثلاً openrouter) */
  preferredProviderId: string | null;
  /** مدل پیشنهادی برای متن (در صورت تنظیم برای سازمان/کاربر) */
  preferredModel: string | null;
  /** حد نرخ درخواست در دقیقه (اختیاری؛ برای اعمال در throttle) */
  rateLimitPerMinute: number | null;
}

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  /**
   * سیاست مسیریابی را برای کاربر/سازمان برمی‌گرداند.
   * اول سازمان (در صورت عضویت)، بعد تنظیمات پیش‌فرض.
   */
  async getRouting(userId: string, organizationId?: string | null): Promise<RoutingPolicy> {
    const result: RoutingPolicy = {
      preferredProviderId: null,
      preferredModel: null,
      rateLimitPerMinute: null,
    };

    const keys: string[] = ['policy_default_provider', 'policy_default_model', 'policy_default_rate_limit'];
    if (organizationId) {
      keys.push(
        `policy_org_${organizationId}_provider`,
        `policy_org_${organizationId}_model`,
        `policy_org_${organizationId}_rate_limit`,
      );
    }

    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    if (organizationId) {
      result.preferredProviderId = map[`policy_org_${organizationId}_provider`] ?? result.preferredProviderId;
      result.preferredModel = map[`policy_org_${organizationId}_model`] ?? result.preferredModel;
      const orgRate = map[`policy_org_${organizationId}_rate_limit`];
      result.rateLimitPerMinute = orgRate != null ? Number(orgRate) : result.rateLimitPerMinute;
    }

    result.preferredProviderId = result.preferredProviderId ?? map['policy_default_provider'] ?? null;
    result.preferredModel = result.preferredModel ?? map['policy_default_model'] ?? null;
    const defaultRate = map['policy_default_rate_limit'];
    if (result.rateLimitPerMinute == null && defaultRate != null) {
      result.rateLimitPerMinute = Number(defaultRate);
    }

    return result;
  }
}
