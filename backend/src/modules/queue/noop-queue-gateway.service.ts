import { Injectable } from '@nestjs/common';
import { IQueueGateway } from './queue-gateway.interface';

@Injectable()
export class NoopQueueGatewayService implements IQueueGateway {
  async addJob(): Promise<void> {
    // No Redis: jobs are processed by DB polling (JobProcessorService)
  }
}
