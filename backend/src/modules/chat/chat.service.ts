import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { UsersService } from '../users/users.service';
import { MessagesService } from '../messages/messages.service';
import { MemoryService } from '../memory/memory.service';
import { PolicyService } from '../policy/policy.service';
import { getModelCost } from '../providers/ai-provider.interface';

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant called AI Mall. Respond in the same language the user writes in. Be concise and helpful.';

/** Smart modes: fast (low cost), economy (best cost-performance), accurate (strongest). */
export const CHAT_MODES: Record<string, string> = {
  fast: 'openai/gpt-3.5-turbo',
  economy: 'openai/gpt-4o-mini',
  accurate: 'anthropic/claude-3.5-sonnet',
};

export function resolveChatModel(modeOrModel: string | undefined): string {
  if (!modeOrModel) return CHAT_MODES.economy;
  if (CHAT_MODES[modeOrModel]) return CHAT_MODES[modeOrModel];
  return modeOrModel;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private providerManager: ProviderManagerService,
    private usersService: UsersService,
    private messagesService: MessagesService,
    private memoryService: MemoryService,
    private policy: PolicyService,
  ) {}

  /** Labels and hidden prompts for quick actions on assistant messages. */
  private static readonly QUICK_ACTIONS: Record<string, { label: string; instruction: string }> = {
    shorten: { label: 'کوتاه‌تر کن', instruction: 'پاسخ قبلی تو در همین گفتگو را کوتاه‌تر کن. فقط نتیجه نهایی را بفرست، بدون مقدمه یا توضیح اضافه.' },
    formal: { label: 'رسمی‌تر کن', instruction: 'پاسخ قبلی تو را به زبان رسمی و حرفه‌ای بازنویسی کن. فقط متن بازنویسی‌شده را بفرست.' },
    example: { label: 'مثال بزن', instruction: 'بر اساس پاسخ قبلی تو، یک یا دو مثال کاربردی و واضح اضافه کن. فقط همان مثال‌ها (و در صورت نیاز جملهٔ کوتاه قبل از آن) را بفرست.' },
    continue: { label: 'ادامه بده', instruction: 'پاسخ قبلی تو را ادامه بده و همان موضوع را بیشتر باز کن. فقط ادامهٔ متن را بفرست.' },
  };

  /** Build last user message content: string or multimodal array (text + images). */
  private buildUserContent(prompt: string, attachments?: { type: string; data: string; name?: string }[]): string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
    const imageParts = attachments?.filter((a) => a.type === 'image') ?? [];
    if (imageParts.length === 0) return prompt;
    const parts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
    if (prompt.trim()) parts.push({ type: 'text', text: prompt });
    const mimeByExt: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    for (const img of imageParts) {
      const ext = img.name?.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
      const mime = (ext && mimeByExt[ext]) || 'image/jpeg';
      parts.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${img.data}` } });
    }
    return parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts;
  }

  async *chat(
    userId: string,
    conversationId: string,
    message: string,
    modelOrMode?: string,
    regenerate?: boolean,
    regenerateStyle?: string,
    quickAction?: string,
    referenceMessageId?: string,
    attachments?: { type: string; data: string; name?: string }[],
  ): AsyncGenerator<{ type: string; content?: string; coinCost?: number; model?: string; promptTokens?: number; completionTokens?: number; memorySuggestion?: string; compressed?: boolean }> {
    // Verify conversation ownership
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || conv.userId !== userId) {
      throw new Error('گفتگو یافت نشد یا دسترسی ندارید');
    }

    const routing = await this.policy.getRouting(userId);
    // مدل/حالت ارسالی کاربر اولویت دارد؛ در غیر این صورت از تنظیمات گفتگو یا پیش‌فرض
    const usedModel = resolveChatModel(modelOrMode) ?? routing.preferredModel ?? conv.model ?? CHAT_MODES.economy;
    const coinCost = getModelCost(usedModel);

    // Check coin balance before starting
    const user = await this.usersService.findById(userId);
    if (!user || user.coins < coinCost) {
      throw new Error(`اعتبار کافی نیست. حداقل ${coinCost} سکه نیاز است.`);
    }

    let promptToSend = message;

    if (quickAction && referenceMessageId) {
      const actionDef = ChatService.QUICK_ACTIONS[quickAction];
      if (!actionDef) throw new Error('عملیات سریع نامعتبر');
      const refMsg = await this.prisma.message.findFirst({
        where: { id: referenceMessageId, conversationId, role: 'assistant' },
      });
      if (!refMsg) throw new Error('پیام مرجع یافت نشد');
      promptToSend = `${actionDef.instruction}\n\n[پاسخ قبلی دستیار]:\n${refMsg.content}`;
      await this.messagesService.create(conversationId, 'user', actionDef.label);
    } else if (regenerate) {
      await this.messagesService.deleteLastAssistant(conversationId);
    } else if (!regenerate) {
      await this.messagesService.create(conversationId, 'user', message);
    }

    // Auto context compression when conversation is long
    const msgCount = await this.prisma.message.count({ where: { conversationId } });
    let didCompress = false;
    if (msgCount > 15) {
      didCompress = await this.memoryService.autoSummarize(conversationId);
      if (didCompress) yield { type: 'compressed' };
    }

    // Build context with memory (includes summary if available)
    const contextMessages = await this.memoryService.buildContextWithMemory(conversationId, 20);

    let systemPrompt = conv.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    if (regenerate && regenerateStyle) {
      const styleInstructions: Record<string, string> = {
        different: 'کاربر می‌خواهد پاسخی متفاوت (با محتوای دیگر) بدهی.',
        accurate: 'کاربر می‌خواهد پاسخ دقیق‌تر و جزئی‌تر باشد.',
        creative: 'کاربر می‌خواهد پاسخ خلاق‌تر و متنوع‌تر باشد.',
      };
      const extra = styleInstructions[regenerateStyle] || styleInstructions.different;
      systemPrompt += `\n\n[درخواست برای این پاسخ]: ${extra}`;
    }

    const lastUserContent = this.buildUserContent(promptToSend, attachments);
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages,
      { role: 'user', content: lastUserContent },
    ];

    // Smart memory suggestion: only for normal user messages (not quick action)
    if (!regenerate && !quickAction && message.length > 10 && message.length < 500) {
      const memoryPatterns = [/من\s+.+\s+هستم/, /هدف\s+من\s+/, /همیشه\s+/, /ترجیح\s+من\s+/, /کار\s+من\s+/, /نام\s+من\s+/];
      if (memoryPatterns.some((p) => p.test(message))) {
        yield { type: 'memory_suggestion', content: message };
      }
    }

    let fullResponse = '';
    try {
      const stream = this.providerManager.streamTextWithFallback('', usedModel, { messages: fullMessages });
      for await (const chunk of stream) {
        fullResponse += chunk;
        yield { type: 'delta', content: chunk };
      }
    } catch (error) {
      this.logger.error(`Chat stream error: ${error}`);
      throw error;
    }

    // Save assistant message with metadata
    const metadata = JSON.stringify({ model: usedModel, coinCost });
    await this.messagesService.create(conversationId, 'assistant', fullResponse, undefined, metadata);

    // Deduct coins
    try {
      await this.usersService.deductCoins(userId, coinCost, `چت هوشمند (${usedModel})`, 'chat');
    } catch (e) {
      this.logger.warn(`Coin deduction failed: ${e}`);
    }

    // Send usage event
    yield { type: 'usage', coinCost, model: usedModel };

    // Signal done
    yield { type: 'done' };

    // Auto-title if first message pair: عنوان کوتاه بر اساس اولین پیام کاربر
    const totalMessages = await this.prisma.message.count({ where: { conversationId } });
    if (totalMessages <= 2) {
      const titleSource = quickAction ? (ChatService.QUICK_ACTIONS[quickAction]?.label || message) : message;
      const clean = titleSource.replace(/\s+/g, ' ').trim();
      const title = clean.length > 45 ? clean.substring(0, 45) + '…' : (clean || 'گفتگوی جدید');
      await this.prisma.conversation.update({ where: { id: conversationId }, data: { title, model: usedModel } });
    }

    // Auto-summarize (runs in background, non-blocking)
    this.memoryService.autoSummarize(conversationId).catch((err) => {
      this.logger.warn(`Auto-summarize background error: ${err}`);
    });
  }

  /** Estimate cost for a message (for display before sending). همان مبلغی که بعداً کسر می‌شود. */
  async estimate(userId: string, message: string, modeOrModel?: string, conversationId?: string): Promise<{ estimatedCoins: number }> {
    const usedModel = resolveChatModel(modeOrModel) ?? CHAT_MODES.economy;
    const estimatedCoins = getModelCost(usedModel);
    return { estimatedCoins };
  }
}
