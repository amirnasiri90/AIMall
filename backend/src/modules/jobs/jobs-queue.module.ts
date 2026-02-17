import { Module } from '@nestjs/common';
import { JobsModule } from './jobs.module';
import { QueueModule } from '../queue/queue.module';
import { JobsQueueProcessor } from './jobs-queue.processor';

/**
 * Registers Bull consumer for the 'jobs' queue. Import only when REDIS_URL is set (see AppModule).
 */
@Module({
  imports: [QueueModule, JobsModule],
  providers: [JobsQueueProcessor],
})
export class JobsQueueModule {}
