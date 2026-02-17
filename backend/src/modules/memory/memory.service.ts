import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterService } from '../providers/openrouter.service';

const SUMMARY_SYSTEM_PROMPT = `You are a conversation summarizer. Create a concise summary of the conversation in the same language the conversation is in. 
Focus on:
- Key topics discussed
- Important decisions or conclusions
- User preferences or requirements mentioned
- Any action items or follow-ups

Keep the summary under 300 words. Be factual and objective.`;

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private prisma: PrismaService,
    private openRouter: OpenRouterService,
  ) {}

  /**
   * Get memories for a conversation.
   */
  async getMemories(conversationId: string) {
    return this.prisma.conversationMemory.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get the latest summary for a conversation.
   */
  async getLatestSummary(conversationId: string): Promise<string | null> {
    const memory = await this.prisma.conversationMemory.findFirst({
      where: { conversationId, type: 'summary' },
      orderBy: { createdAt: 'desc' },
    });
    return memory?.content || null;
  }

  /**
   * Create or update a memory entry.
   */
  async createMemory(conversationId: string, type: string, content: string) {
    const messageCount = await this.prisma.message.count({ where: { conversationId } });

    return this.prisma.conversationMemory.create({
      data: {
        conversationId,
        type,
        content,
        messageCount,
      },
    });
  }

  /**
   * Update a memory entry.
   */
  async updateMemory(memoryId: string, content: string) {
    const memory = await this.prisma.conversationMemory.findUnique({ where: { id: memoryId } });
    if (!memory) throw new NotFoundException('حافظه یافت نشد');

    return this.prisma.conversationMemory.update({
      where: { id: memoryId },
      data: { content },
    });
  }

  /**
   * Delete a memory entry.
   */
  async deleteMemory(memoryId: string) {
    await this.prisma.conversationMemory.delete({ where: { id: memoryId } });
    return { success: true };
  }

  /**
   * Auto-summarize a conversation when message count exceeds threshold.
   * Called after each chat message.
   */
  async autoSummarize(conversationId: string): Promise<boolean> {
    try {
      // Get threshold from system settings
      const thresholdSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'memory_auto_summary_threshold' },
      });
      const threshold = parseInt(thresholdSetting?.value || '10');

      // Count messages since last summary
      const lastSummary = await this.prisma.conversationMemory.findFirst({
        where: { conversationId, type: 'summary' },
        orderBy: { createdAt: 'desc' },
      });

      const messagesSinceLastSummary = lastSummary
        ? await this.prisma.message.count({
            where: {
              conversationId,
              createdAt: { gt: lastSummary.createdAt },
            },
          })
        : await this.prisma.message.count({ where: { conversationId } });

      if (messagesSinceLastSummary < threshold) {
        return false; // Not enough messages to summarize
      }

      // Get messages to summarize
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 50, // Limit to prevent token overflow
      });

      if (messages.length < 4) return false;

      // Build conversation text for summarization
      const conversationText = messages
        .map((m) => `${m.role === 'user' ? 'کاربر' : 'دستیار'}: ${m.content}`)
        .join('\n\n');

      const previousSummary = lastSummary ? `خلاصه قبلی:\n${lastSummary.content}\n\nادامه مکالمه:\n` : '';

      // Generate summary using AI
      const result = await this.openRouter.generateText(
        `${previousSummary}${conversationText}`,
        'openai/gpt-4o-mini',
        {
          messages: [
            { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
            { role: 'user', content: `${previousSummary}${conversationText}` },
          ],
          maxTokens: 500,
        },
      );

      if (result.text) {
        await this.createMemory(conversationId, 'summary', result.text);

        // Also update the conversation's summary field
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { summary: result.text, summaryAt: new Date() },
        });

        this.logger.log(`Auto-summary created for conversation ${conversationId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Auto-summary failed for ${conversationId}: ${error}`);
      return false;
    }
  }

  /**
   * Build context messages including memory for a conversation.
   * Returns optimized message list with summary + recent messages.
   */
  async buildContextWithMemory(
    conversationId: string,
    maxMessages = 20,
  ): Promise<Array<{ role: string; content: string }>> {
    const summary = await this.getLatestSummary(conversationId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: maxMessages,
    });

    // Reverse to chronological order
    const recentMessages = messages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (summary) {
      // Prepend summary as context
      return [
        {
          role: 'system',
          content: `خلاصه مکالمه قبلی:\n${summary}`,
        },
        ...recentMessages,
      ];
    }

    return recentMessages;
  }

  /**
   * Manual summary trigger.
   */
  async triggerSummary(conversationId: string) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    if (messages.length < 2) {
      throw new NotFoundException('پیام کافی برای خلاصه‌سازی وجود ندارد');
    }

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'کاربر' : 'دستیار'}: ${m.content}`)
      .join('\n\n');

    const result = await this.openRouter.generateText(
      conversationText,
      'openai/gpt-4o-mini',
      {
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
          { role: 'user', content: conversationText },
        ],
        maxTokens: 500,
      },
    );

    if (!result.text) throw new Error('خلاصه‌سازی ناموفق بود');

    const memory = await this.createMemory(conversationId, 'summary', result.text);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { summary: result.text, summaryAt: new Date() },
    });

    return memory;
  }
}
