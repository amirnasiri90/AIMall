import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { IQueueGateway } from './queue-gateway.interface';

@Injectable()
export class RedisQueueGatewayService implements IQueueGateway {
  constructor(@InjectQueue('jobs') private queue: Queue) {}

  async addJob(jobId: string, userId: string, type: string, payload: Record<string, any>): Promise<void> {
    await this.queue.add(
      { jobId, userId, type, payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 500 },
    );
  }
}
