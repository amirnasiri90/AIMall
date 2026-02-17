import { Module } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { PolicyRateLimitStore } from './policy-rate-limit.store';
import { PolicyThrottleInterceptor } from './policy-throttle.interceptor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PolicyService, PolicyRateLimitStore, PolicyThrottleInterceptor],
  exports: [PolicyService, PolicyRateLimitStore],
})
export class PolicyModule {}
