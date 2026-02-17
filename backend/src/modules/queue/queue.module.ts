import { DynamicModule, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_GATEWAY } from './queue-gateway.interface';
import { RedisQueueGatewayService } from './redis-queue-gateway.service';
import { NoopQueueGatewayService } from './noop-queue-gateway.service';

const REDIS_URL = process.env.REDIS_URL || '';

/**
 * When REDIS_URL is set, registers Bull with Redis for job queue.
 * When not set, no queue is registered and DB polling is used (JobProcessorService).
 */
@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    const useRedis = !!REDIS_URL && REDIS_URL.length > 0;
    const imports: DynamicModule['imports'] = [];
    const providers: DynamicModule['providers'] = [
      { provide: QUEUE_GATEWAY, useClass: useRedis ? RedisQueueGatewayService : NoopQueueGatewayService },
    ];

    if (useRedis) {
      imports.push(
        BullModule.forRoot({ redis: REDIS_URL }),
        BullModule.registerQueue({ name: 'jobs' }),
      );
    }

    return {
      module: QueueModule,
      global: true,
      imports,
      providers,
      exports: [QUEUE_GATEWAY, ...(useRedis ? [BullModule] : [])],
    };
  }
}
