import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { getModelCost } from '../providers/ai-provider.interface';
import { TEXT_TEMPLATES } from './text-templates';

const toneMap: Record<string, string> = {
  professional: 'حرفه‌ای و رسمی',
  casual: 'محاوره‌ای و صمیمی',
  creative: 'خلاقانه و ادبی',
  academic: 'آکادمیک و علمی',
};

const lengthMap: Record<string, string> = {
  short: 'حدود 100 کلمه',
  medium: 'حدود 300 کلمه',
  long: 'حدود 600 کلمه',
};

const languageMap: Record<string, string> = {
  fa: 'فارسی',
  en: 'انگلیسی',
  ar: 'عربی',
};

const SYSTEM_PROMPT = 'تو یک نویسنده حرفه‌ای هستی. متن درخواستی را با لحن و طول مشخص شده تولید کن. به همان زبان کاربر (یا زبان درخواستی) پاسخ بده.';

@Injectable()
export class TextService {
  constructor(
    private prisma: PrismaService,
    private providerManager: ProviderManagerService,
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
  ) {}

  getTemplates() {
    return TEXT_TEMPLATES;
  }

  buildPrompt(params: {
    prompt: string;
    tone?: string;
    length?: string;
    language?: string;
    audience?: string;
    styleGuide?: string;
    templateId?: string;
  }): string {
    let enhanced = params.prompt;
    const parts: string[] = [];

    if (params.tone) parts.push(`لحن: ${toneMap[params.tone] || params.tone}`);
    if (params.length) parts.push(`طول: ${lengthMap[params.length] || params.length}`);
    if (params.language) parts.push(`زبان خروجی: ${languageMap[params.language] || params.language}`);
    if (params.audience) parts.push(`مخاطب: ${params.audience}`);
    if (params.styleGuide) parts.push(`راهنمای سبک: ${params.styleGuide}`);

    if (parts.length) enhanced += '\n\n' + parts.join('\n');
    return enhanced;
  }

  async generate(
    userId: string,
    prompt: string,
    tone?: string,
    length?: string,
    model?: string,
    templateId?: string,
    variants?: number,
    maxTokens?: number,
    language?: string,
    audience?: string,
    styleGuide?: string,
    organizationId?: string | null,
  ) {
    if (organizationId) await this.organizationsService.checkOrgTextLimit(organizationId, userId);
    const effectiveModel = model || 'openai/gpt-4o-mini';
    const coinCost = getModelCost(effectiveModel);
    const count = Math.min(Math.max(variants ?? 1, 1), 3);
    const totalCost = coinCost * count;

    const user = await this.usersService.findById(userId);
    if (!user || user.coins < totalCost) {
      throw new Error(`اعتبار کافی نیست. حداقل ${totalCost} سکه نیاز است.`);
    }

    const enhancedPrompt = this.buildPrompt({
      prompt,
      tone,
      length,
      language,
      audience,
      styleGuide,
      templateId,
    });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: enhancedPrompt },
    ];

    const outputs: string[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.providerManager.generateTextWithFallback(enhancedPrompt, effectiveModel, {
        messages,
        maxTokens: maxTokens || 2000,
      }, 'text');
      outputs.push(result.text);
    }

    await this.usersService.deductCoins(userId, totalCost, 'تولید متن', 'text');

    const output = outputs.length === 1 ? outputs[0] : outputs.join('\n\n---\n\n');
    await this.prisma.generation.create({
      data: {
        userId,
        organizationId: organizationId || undefined,
        service: 'text',
        input: prompt,
        output,
        model: effectiveModel,
        coinCost: totalCost,
        metadata: JSON.stringify({
          tone,
          length,
          templateId,
          variants: count,
          language,
          audience,
          outputs: count > 1 ? outputs : undefined,
        }),
      },
    });

    return {
      output: outputs.length === 1 ? outputs[0] : outputs,
      model: effectiveModel,
      coinCost: totalCost,
      variants: outputs.length > 1 ? outputs : undefined,
    };
  }

  estimate(model?: string): { estimatedCoins: number } {
    const effectiveModel = model || 'openai/gpt-4o-mini';
    return { estimatedCoins: getModelCost(effectiveModel) };
  }

  async *streamGenerate(
    userId: string,
    prompt: string,
    tone?: string,
    length?: string,
    model?: string,
    maxTokens?: number,
    language?: string,
    audience?: string,
    styleGuide?: string,
    organizationId?: string | null,
  ): AsyncGenerator<{ type: string; content?: string; coinCost?: number; model?: string }> {
    if (organizationId) await this.organizationsService.checkOrgTextLimit(organizationId, userId);
    const effectiveModel = model || 'openai/gpt-4o-mini';
    const coinCost = getModelCost(effectiveModel);

    const user = await this.usersService.findById(userId);
    if (!user || user.coins < coinCost) {
      throw new Error(`اعتبار کافی نیست. حداقل ${coinCost} سکه نیاز است.`);
    }

    const enhancedPrompt = this.buildPrompt({
      prompt,
      tone,
      length,
      language,
      audience,
      styleGuide,
    });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: enhancedPrompt },
    ];

    let fullText = '';
    try {
      for await (const chunk of this.providerManager.streamTextWithFallback(enhancedPrompt, effectiveModel, {
        messages,
        maxTokens: maxTokens || 2000,
      }, 'text')) {
        fullText += chunk;
        yield { type: 'chunk', content: chunk };
      }
    } catch (err) {
      yield { type: 'error', content: (err as Error).message };
      return;
    }

    await this.usersService.deductCoins(userId, coinCost, 'تولید متن (استریم)', 'text');
    await this.prisma.generation.create({
      data: {
        userId,
        organizationId: organizationId || undefined,
        service: 'text',
        input: prompt,
        output: fullText,
        model: effectiveModel,
        coinCost,
        metadata: JSON.stringify({ tone, length, language, audience, stream: true }),
      },
    });

    yield { type: 'usage', coinCost, model: effectiveModel };
    yield { type: 'done' };
  }

  async action(
    userId: string,
    action: string,
    text: string,
    tone?: string,
    model?: string,
    organizationId?: string | null,
  ): Promise<{ output: string; coinCost: number; model: string }> {
    if (organizationId) await this.organizationsService.checkOrgTextLimit(organizationId, userId);
    const effectiveModel = model || 'openai/gpt-4o-mini';
    const coinCost = getModelCost(effectiveModel);

    const user = await this.usersService.findById(userId);
    if (!user || user.coins < coinCost) {
      throw new Error(`اعتبار کافی نیست. حداقل ${coinCost} سکه نیاز است.`);
    }

    const instructions: Record<string, string> = {
      continue: 'متن زیر را ادامه بده. همان سبک و لحن را حفظ کن و محتوای منطقی و مرتبط اضافه کن.',
      shorten: 'متن زیر را خلاصه کن. فقط نکات اصلی را حفظ کن و کوتاه و روان بنویس.',
      changeTone: `متن زیر را با لحن ${tone ? toneMap[tone] || tone : 'حرفه‌ای'} بازنویسی کن. معنا عوض نشود، فقط لحن عوض شود.`,
      rewrite: 'متن زیر را بازنویسی کن. معنا و مفهوم را حفظ کن ولی عبارت‌ها را متفاوت و روان‌تر بنویس.',
      improve: 'متن زیر را از نظر دستور زبان، املاء و روان‌بودن بهبود بده. حداقل تغییر ممکن را بده و فقط اصلاح کن.',
    };

    const instruction = instructions[action] || instructions.rewrite;
    const userContent = `${instruction}\n\n---\n\n${text}`;

    const result = await this.providerManager.generateTextWithFallback(userContent, effectiveModel, {
      messages: [
        { role: 'system', content: 'تو یک ویراستار و نویسنده حرفه‌ای هستی. دقیقاً طبق دستور کاربر عمل کن. به همان زبان متن پاسخ بده.' },
        { role: 'user', content: userContent },
      ],
      maxTokens: 2000,
    }, 'text');

    await this.usersService.deductCoins(userId, coinCost, `ویرایش متن (${action})`, 'text');
    await this.prisma.generation.create({
      data: {
        userId,
        organizationId: organizationId || undefined,
        service: 'text',
        input: `[${action}] ${text.slice(0, 200)}...`,
        output: result.text,
        model: effectiveModel,
        coinCost,
        metadata: JSON.stringify({ action, tone: action === 'changeTone' ? tone : undefined }),
      },
    });

    return { output: result.text, coinCost, model: effectiveModel };
  }

  async getHistory(
    userId: string,
    search?: string,
    from?: string,
    to?: string,
    tag?: string,
  ) {
    const where: any = { userId, service: 'text' };

    if (search?.trim()) {
      where.OR = [
        { input: { contains: search } },
        { output: { contains: search } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (tag?.trim()) {
      where.metadata = { contains: tag };
    }

    return this.prisma.generation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
