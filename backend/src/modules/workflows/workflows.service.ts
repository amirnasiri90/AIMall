import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private prisma: PrismaService,
    private executor: WorkflowExecutorService,
    private jobsService: JobsService,
  ) {}

  async create(userId: string, name: string, definition: any, organizationId?: string) {
    return this.prisma.workflow.create({
      data: {
        userId,
        name,
        definition: JSON.stringify(definition),
        organizationId: organizationId || null,
      },
    });
  }

  private async getUserOrgIds(userId: string): Promise<string[]> {
    const members = await this.prisma.orgMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return members.map((m) => m.organizationId);
  }

  async list(userId: string, organizationId?: string) {
    const orgIds = await this.getUserOrgIds(userId);
    const baseWhere: any = {
      OR: [
        { userId },
        ...(orgIds.length ? [{ organizationId: { in: orgIds } }] : []),
      ],
    };
    const where = organizationId
      ? { AND: [baseWhere, { organizationId }] }
      : baseWhere;
    return this.prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    });
  }

  async findOne(id: string, userId: string) {
    const orgIds = await this.getUserOrgIds(userId);
    const w = await this.prisma.workflow.findFirst({
      where: {
        id,
        OR: [{ userId }, ...(orgIds.length ? [{ organizationId: { in: orgIds } }] : [])],
      },
    });
    if (!w) throw new ForbiddenException('دسترسی به این ورک‌فلو ندارید');
    return {
      ...w,
      definition: JSON.parse(w.definition),
    };
  }

  /** Execute workflow only (no run record). Used by job processor. */
  async executeWorkflowOnly(workflowId: string, userId: string, input: Record<string, any>) {
    const workflow = await this.findOne(workflowId, userId);
    const definition = workflow.definition as { steps: any[] };
    return this.executor.run(userId, definition, input);
  }

  async run(id: string, userId: string, input: Record<string, any>, async = false) {
    const workflow = await this.findOne(id, userId);
    const definition = workflow.definition as { steps: any[] };

    if (async) {
      const job = await this.jobsService.create(userId, 'workflow', { workflowId: id, input });
      const run = await this.prisma.workflowRun.create({
        data: {
          workflowId: id,
          userId,
          jobId: job.id,
          status: 'PENDING',
          input: JSON.stringify(input),
        },
      });
      return { jobId: job.id, runId: run.id, status: 'PENDING', message: 'ورک‌فلو در صف اجرا است' };
    }

    const { output, steps } = await this.executor.run(userId, definition, input);

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId: id,
        userId,
        status: 'COMPLETED',
        input: JSON.stringify(input),
        output: JSON.stringify({ output, steps }),
        completedAt: new Date(),
      },
    });

    return { runId: run.id, output, steps };
  }

  /** Called by job processor when async workflow completes */
  async completeRunByJobId(jobId: string, output: Record<string, any>, error?: string) {
    const run = await this.prisma.workflowRun.findFirst({ where: { jobId } });
    if (!run) return;
    await this.prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: error ? 'FAILED' : 'COMPLETED',
        output: error ? null : JSON.stringify(output),
        error: error || null,
        completedAt: new Date(),
      },
    });
  }

  async getRuns(workflowId: string, userId: string, limit = 20) {
    await this.findOne(workflowId, userId);
    const runs = await this.prisma.workflowRun.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return runs.map((r) => ({
      ...r,
      output: r.output ? (JSON.parse(r.output) as unknown) : null,
    }));
  }

  async findRun(workflowId: string, runId: string, userId: string) {
    await this.findOne(workflowId, userId);
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, workflowId },
    });
    if (!run) throw new NotFoundException('اجرای ورک‌فلو یافت نشد');
    return {
      ...run,
      output: run.output ? (JSON.parse(run.output) as unknown) : null,
    };
  }
}
