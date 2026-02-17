import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private organizationsService: OrganizationsService,
  ) {}

  async create(userId: string, title?: string, agentId?: string, organizationId?: string | null) {
    if (organizationId) {
      await this.organizationsService.checkOrgChatLimit(organizationId, userId);
    }
    return this.prisma.conversation.create({
      data: {
        userId,
        title: title || 'گفتگوی جدید',
        agentId: agentId || null,
        organizationId: organizationId || null,
      },
    });
  }

  async findAll(
    userId: string,
    options?: { search?: string; pinned?: boolean; archived?: boolean; organizationId?: string | null },
  ) {
    const where: any = { userId, agentId: null };
    if (options?.organizationId !== undefined) {
      where.organizationId = options.organizationId ?? null;
    }

    if (options?.archived) {
      where.isArchived = true;
    } else {
      where.isArchived = false;
    }

    if (options?.pinned !== undefined) {
      where.isPinned = options.pinned;
    }

    if (options?.search) {
      where.title = { contains: options.search };
    }

    return this.prisma.conversation.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findAllByAgent(userId: string, agentId: string, organizationId?: string | null) {
    const where: any = { userId, agentId };
    if (organizationId !== undefined) where.organizationId = organizationId ?? null;
    return this.prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conv) throw new NotFoundException('گفتگو یافت نشد');
    if (conv.userId !== userId) throw new ForbiddenException();
    return conv;
  }

  async delete(id: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conv) throw new NotFoundException('گفتگو یافت نشد');
    if (conv.userId !== userId) throw new ForbiddenException();
    await this.prisma.conversation.delete({ where: { id } });
    return { success: true };
  }

  async updateTitle(id: string, userId: string, title: string) {
    await this.findOne(id, userId);
    return this.prisma.conversation.update({ where: { id }, data: { title } });
  }

  async togglePin(id: string, userId: string) {
    const conv = await this.findOne(id, userId);
    return this.prisma.conversation.update({
      where: { id },
      data: { isPinned: !conv.isPinned },
    });
  }

  async toggleArchive(id: string, userId: string) {
    const conv = await this.findOne(id, userId);
    return this.prisma.conversation.update({
      where: { id },
      data: { isArchived: !conv.isArchived },
    });
  }

  async updateSystemPrompt(id: string, userId: string, systemPrompt: string | null) {
    await this.findOne(id, userId);
    return this.prisma.conversation.update({
      where: { id },
      data: { systemPrompt },
    });
  }

  /** Fork conversation: create new conv and copy messages up to (and including) upToMessageId. */
  async fork(sourceId: string, userId: string, upToMessageId: string) {
    const source = await this.findOne(sourceId, userId);
    const allMessages = await this.prisma.message.findMany({
      where: { conversationId: sourceId },
      orderBy: { createdAt: 'asc' },
    });
    const idx = allMessages.findIndex((m) => m.id === upToMessageId);
    if (idx < 0) throw new NotFoundException('پیام یافت نشد');
    const toCopy = allMessages.slice(0, idx + 1);
    const newConv = await this.prisma.conversation.create({
      data: {
        userId,
        title: (source.title || 'گفتگوی جدید') + ' (ادامه)',
        systemPrompt: source.systemPrompt,
        organizationId: source.organizationId ?? undefined,
      },
    });
    for (const m of toCopy) {
      await this.prisma.message.create({
        data: { conversationId: newConv.id, role: m.role, content: m.content, metadata: m.metadata },
      });
    }
    return newConv;
  }
}
