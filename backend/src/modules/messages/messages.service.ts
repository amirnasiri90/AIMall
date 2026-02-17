import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async create(conversationId: string, role: string, content: string, tokenCount?: number, metadata?: string) {
    const message = await this.prisma.message.create({
      data: { conversationId, role, content, tokenCount, metadata },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return message;
  }

  async findByConversation(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteLastAssistant(conversationId: string) {
    const last = await this.prisma.message.findFirst({
      where: { conversationId, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
    });
    if (last) {
      await this.prisma.message.delete({ where: { id: last.id } });
    }
    return last;
  }
}
