import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { INTENT_OPTIONS } from './intent.constants';

export interface ClassifyIntentResult {
  href: string;
  label: string;
  desc: string;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private providerManager: ProviderManagerService,
  ) {}

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

  /**
   * تحلیل خواستهٔ محاوره‌ای کاربر با LLM و برگرداندن بخش مناسب پنل.
   * در صورت خطا null برمی‌گرداند.
   */
  async classifyIntent(userText: string): Promise<ClassifyIntentResult | null> {
    const text = (userText || '').trim();
    if (!text) return null;

    const keywordHref = this.resolveSpecificAgentFromText(text);
    if (keywordHref) {
      const option = INTENT_OPTIONS.find((o) => o.href === keywordHref);
      if (option) return { href: option.href, label: option.label, desc: option.desc };
    }

    const list = INTENT_OPTIONS.map((o) => `- ${o.href} → ${o.label}: ${o.desc}`).join('\n');
    const systemPrompt = `تو راهنمای پنل هستی. کاربر یک خواسته می‌نویسد. فقط یکی از مسیرهای زیر را در جواب بنویس (فقط href، هیچ چیز دیگر نه).

قانون مهم: هرگز /agents را جواب نده مگر کاربر فقط «لیست دستیار» یا «همه دستیارها» گفته باشد. برای هر خواستهٔ مشخص حتماً دستیار تخصصی را بده.

هر موضوع → مسیر:
- غذا، آشپزی، پخت، بپزم، درست کنم غذا، قرمه سبزی، خورش، ناهار، شام، دستور پخت → /agents/home
- ست لباس، لباس، استایل، چه بپوشم، کمد، فشن، مد → /agents/fashion
- لاغری، ورزش، رژیم، تناسب اندام، تغذیه، کاهش وزن → /agents/fitness-diet
- سفر، گردش، تور، مسافرت، مقصد، کجا برم، برنامه سفر → /agents/travel-tourism
- درس، ریاضی، علوم، تمرین، مدرسه، معلم، دانش\u200cآموز → /agents/student-tutor
- سهام، بورس، سرمایه، مالی، واچ\u200cلیست، سرمایه\u200cگذاری → /agents/finance
- روتین، برنامه روزانه، عادت، سبک زندگی → /agents/lifestyle
- اینستاگرام، ریلز، کپشن، پست، محتوا اینستا → /agents/instagram-admin
- pdf، ورد به pdf، سند فارسی → /agents/persian-pdf-maker
- عکس، تصویر بسازم → /image-studio
- سکه، خرید، بسته، شارژ، پرداخت → /billing
- سوال عمومی بدون موضوع بالا → /chat

لیست مسیرها:
${list}`;

    const userPrompt = `خواستهٔ کاربر: «${text}»

فقط مسیر (href) را بنویس:`;

    try {
      const result = await this.providerManager.generateTextWithFallback(
        userPrompt,
        undefined,
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          maxTokens: 80,
        },
        'chat',
      );
      const raw = (typeof result === 'string' ? result : (result?.text ?? '')).trim();
      let href = this.parseHrefFromResponse(raw);
      if (!href) return null;
      if (href === '/agents') href = this.resolveSpecificAgentFromText(text) || href;
      const option = INTENT_OPTIONS.find((o) => o.href === href);
      return option ? { href: option.href, label: option.label, desc: option.desc } : null;
    } catch (err: any) {
      this.logger.warn(`Intent classification failed: ${err?.message || err}`);
      return null;
    }
  }

  /** با کلیدواژه و عبارت‌های محاوره‌ای دستیار تخصصی را تشخیص می‌دهیم. اول صدا زده می‌شود؛ اگر جواب داشت از مدل استفاده نمی‌کنیم. */
  private resolveSpecificAgentFromText(userText: string): string | null {
    const t = userText.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!t) return null;
    const checks: { href: string; keywords: string[] }[] = [
      {
        href: '/agents/home',
        keywords: [
          'قرمه', 'خورش', 'خورشت', 'بپزم', 'پخت', 'آشپزی', 'غذا درست', 'ناهار', 'شام',
          'دستور پخت', 'خوراک', 'دستور غذا', 'غذا بپزم', 'غذا درست کنم', 'پخت غذا', 'برنامه غذایی',
          'خوراک درست', 'غذای امروز', 'شام درست', 'ناهار درست', 'خورش درست', 'قرمه سبزی',
        ],
      },
      {
        href: '/agents/fashion',
        keywords: [
          'ست لباس', 'ست کنم', 'ست درست', 'لباس', 'استایل', 'کمد', 'چه بپوشم', 'پوشش', 'فشن', 'مد',
          'لباسام', 'لباس هام', 'ست بدم', 'ست بزنم', 'هماهنگ بپوشم',
        ],
      },
      {
        href: '/agents/fitness-diet',
        keywords: [
          'لاغر', 'ورزش', 'رژیم', 'تناسب', 'تغذیه', 'کاهش وزن', 'چاق', 'وزن کم', 'برنامه ورزش',
          'رژیم بگیرم', 'لاغر بشم', 'تناسب اندام', 'ورزش کنم',
        ],
      },
      {
        href: '/agents/travel-tourism',
        keywords: [
          'سفر', 'گردش', 'تور', 'مسافرت', 'مقصد', 'سفر برم', 'کجا برم', 'برنامه سفر', 'سفر برنامه',
          'مقصد پیشنهاد', 'تور برم', 'مسافرت برم',
        ],
      },
      {
        href: '/agents/student-tutor',
        keywords: [
          'درس', 'ریاضی', 'علوم', 'تمرین', 'مدرسه', 'معلم', 'تدریس', 'دانش\u200cآموز', 'دانش آموز',
          'حل کنم', 'تمرین حل', 'درس بخونم', 'ریاضی حل', 'علوم بخونم',
        ],
      },
      {
        href: '/agents/finance',
        keywords: [
          'سهام', 'بورس', 'سرمایه', 'مالی', 'واچ\u200cلیست', 'معامله', 'سرمایه\u200cگذاری',
          'سرمایه گذاری', 'پول سرمایه', 'سهم بخرم', 'تحلیل سهام',
        ],
      },
      {
        href: '/agents/lifestyle',
        keywords: [
          'روتین', 'برنامه روزانه', 'عادت', 'سبک زندگی', 'کارهای روزانه', 'برنامه روز',
          'روزمره', 'برنامه ریزی روز',
        ],
      },
      {
        href: '/agents/instagram-admin',
        keywords: [
          'اینستاگرام', 'اینستا', 'ریلز', 'کپشن', 'هشتگ', 'محتوا برند', 'پست اینستا',
          'محتوا اینستا', 'کپشن بنویسم', 'پست بذارم', 'ادمین اینستا',
        ],
      },
      {
        href: '/agents/persian-pdf-maker',
        keywords: [
          'pdf', 'ورد به pdf', 'سند فارسی', 'تبدیل pdf', 'pdf بسازم', 'فایل pdf',
          'متن به pdf', 'ورد تبدیل',
        ],
      },
    ];
    for (const { href, keywords } of checks) {
      if (keywords.some((kw) => t.includes(kw))) return href;
    }
    return null;
  }

  private parseHrefFromResponse(raw: string): string | null {
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const hrefs = INTENT_OPTIONS.map((o) => o.href);
    for (const href of hrefs) {
      if (normalized === href || normalized.endsWith(' ' + href) || normalized.includes(href)) return href;
    }
    const match = raw.match(/\/[a-z0-9/-]+/i);
    if (match) {
      const candidate = match[0].replace(/\/+$/, '');
      if (hrefs.includes(candidate)) return candidate;
    }
    return null;
  }
}
