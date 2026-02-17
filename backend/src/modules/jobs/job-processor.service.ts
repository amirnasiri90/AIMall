import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobRunnerService } from './job-runner.service';

const USE_REDIS = !!(process.env.REDIS_URL && process.env.REDIS_URL.length > 0);

/**
 * Polls DB for PENDING jobs when Redis/Bull is not used. When REDIS_URL is set, Bull handles jobs and this poller does not run.
 */
@Injectable()
export class JobProcessorService implements OnModuleInit {
  private readonly logger = new Logger(JobProcessorService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(
    private jobsService: JobsService,
    private jobRunner: JobRunnerService,
  ) {}

  onModuleInit() {
    if (USE_REDIS) {
      this.logger.log('Redis queue enabled; DB polling disabled');
      return;
    }
    const intervalMs = parseInt(process.env.JOB_POLL_INTERVAL_MS || '3000', 10);
    this.intervalId = setInterval(() => this.tick(), intervalMs);
    this.logger.log(`Job processor started (DB poll every ${intervalMs}ms)`);
  }

  private async tick() {
    if (this.processing) return;
    const job = await this.jobsService.claimNextPending();
    if (!job) return;

    this.processing = true;
    try {
      await this.jobRunner.run(job);
    } catch (err: any) {
      this.logger.error(`Job ${job.id} failed: ${err.message}`);
      await this.jobsService.complete(job.id, {}, err.message);
    } finally {
      this.processing = false;
    }
  }
}
