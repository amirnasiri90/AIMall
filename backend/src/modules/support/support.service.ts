import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VALID_STATUSES = ['IN_PROGRESS', 'SUPPORT_REPLIED', 'CUSTOMER_REPLIED', 'CLOSED'] as const;

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    subject: string,
    body: string,
    category: string = 'CONSULTING_SALES',
    attachmentUrl?: string | null,
  ) {
    const validCategory = ['CONSULTING_SALES', 'TECHNICAL'].includes(category) ? category : 'CONSULTING_SALES';
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject,
        category: validCategory,
        status: 'IN_PROGRESS',
        messages: {
          create: { authorId: userId, content: body, isStaff: false, attachmentUrl: attachmentUrl ?? undefined },
        },
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return ticket;
  }

  async findMyTickets(userId: string, status?: string) {
    const where: { userId: string; status?: string } = { userId };
    if (status && VALID_STATUSES.includes(status as any)) where.status = status;
    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { take: 1, orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findOneForUser(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    if (ticket.userId !== userId) throw new ForbiddenException();
    return ticket;
  }

  async reopen(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    if (ticket.userId !== userId) throw new ForbiddenException('شما مالک این تیکت نیستید');
    if (ticket.status !== 'CLOSED') throw new ForbiddenException('فقط تیکت بسته شده را می‌توان بازگشایی کرد');
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'CUSTOMER_REPLIED', updatedAt: new Date() },
    });
  }

  async addMessage(
    ticketId: string,
    userId: string,
    content: string,
    isStaff = false,
    attachmentUrl?: string | null,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    const ownerId = String(ticket.userId);
    const authorId = userId != null ? String(userId) : '';
    if (!isStaff && ownerId !== authorId) throw new ForbiddenException('شما مالک این تیکت نیستید یا نشست شما منقضی شده است');
    if (!isStaff && ticket.status === 'CLOSED') throw new ForbiddenException('این تیکت بسته است. برای ادامه گفتگو آن را بازگشایی کنید.');
    const newStatus = isStaff ? 'SUPPORT_REPLIED' : 'CUSTOMER_REPLIED';
    const msg = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: userId,
        content,
        isStaff,
        attachmentUrl: attachmentUrl ?? undefined,
      },
      include: { author: { select: { id: true, name: true } } },
    });
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: newStatus, updatedAt: new Date() },
    });
    return msg;
  }

  async findAllForAdmin(options?: { status?: string; category?: string; page?: number; limit?: number }) {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: { status?: string; category?: string } = {};
    if (options?.status && VALID_STATUSES.includes(options.status as any)) where.status = options.status;
    if (options?.category && ['CONSULTING_SALES', 'TECHNICAL'].includes(options.category)) where.category = options.category;
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          messages: { take: 1, orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneForAdmin(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true, email: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    return ticket;
  }

  async updateStatus(ticketId: string, status: string) {
    if (!VALID_STATUSES.includes(status as any)) throw new ForbiddenException('وضعیت نامعتبر');
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
  }

  async assign(ticketId: string, assignedToId: string | null) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId },
    });
  }

  async setMessageAttachment(ticketId: string, messageId: string, attachmentUrl: string) {
    const msg = await this.prisma.ticketMessage.findFirst({
      where: { id: messageId, ticketId },
    });
    if (!msg) throw new NotFoundException('پیام یافت نشد');
    return this.prisma.ticketMessage.update({
      where: { id: messageId },
      data: { attachmentUrl },
    });
  }
}
