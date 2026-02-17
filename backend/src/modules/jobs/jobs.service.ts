import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_GATEWAY, IQueueGateway } from '../queue/queue-gateway.interface';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    @Inject(QUEUE_GATEWAY) private queueGateway: IQueueGateway,
  ) {}

  async create(userId: string, type: string, payload: Record<string, any>) {
    const job = await this.prisma.job.create({
      data: {
        userId,
        type,
        payload: JSON.stringify(payload),
        status: 'PENDING',
      },
    });
    await this.queueGateway.addJob(job.id, userId, type, payload);
    return { id: job.id, status: 'PENDING', type, createdAt: job.createdAt };
  }

  async getStatus(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('کار یافت نشد');
    if (job.userId !== userId) throw new ForbiddenException('دسترسی ندارید');

    const result: any = {
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
    if (job.payload) result.payload = JSON.parse(job.payload);
    if (job.result) result.result = JSON.parse(job.result);
    if (job.error) result.error = job.error;
    return result;
  }

  async list(userId: string, page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          error: true,
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return { jobs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async claimNextPending(): Promise<{ id: string; userId: string; type: string; payload: any } | null> {
    const job = await this.prisma.job.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return null;

    await this.prisma.job.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    let payload: any = {};
    try {
      if (job.payload) payload = JSON.parse(job.payload);
    } catch {}

    return { id: job.id, userId: job.userId, type: job.type, payload };
  }

  async complete(jobId: string, result: Record<string, any>, error?: string) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: error ? 'FAILED' : 'COMPLETED',
        result: result ? JSON.stringify(result) : null,
        error: error || null,
        completedAt: new Date(),
      },
    });
  }
}
