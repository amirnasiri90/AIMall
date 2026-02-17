import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { JobRunnerService } from './job-runner.service';

export interface BullJobData {
  jobId: string;
  userId: string;
  type: string;
  payload: Record<string, any>;
}

@Processor('jobs')
export class JobsQueueProcessor {
  private readonly logger = new Logger(JobsQueueProcessor.name);

  constructor(private jobRunner: JobRunnerService) {}

  @Process()
  async handleJob(job: Job<BullJobData>) {
    const { jobId, userId, type, payload } = job.data;
    this.logger.debug(`Processing job ${jobId} (${type})`);
    await this.jobRunner.run({ id: jobId, userId, type, payload });
  }

  @OnQueueFailed()
  onFailed(job: Job<BullJobData>, err: Error) {
    this.logger.error(`Job ${job?.data?.jobId} failed: ${err.message}`);
  }
}
