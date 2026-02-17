import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { PolicyService } from './policy.service';
import { PolicyRateLimitStore } from './policy-rate-limit.store';

@Injectable()
export class PolicyThrottleInterceptor implements NestInterceptor {
  constructor(
    private policy: PolicyService,
    private store: PolicyRateLimitStore,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    if (!user?.id) return next.handle();

    const organizationId = (request as any).organizationId ?? undefined;
    const routing = await this.policy.getRouting(user.id, organizationId);
    const limit = routing.rateLimitPerMinute;
    if (limit == null || limit <= 0) return next.handle();

    const key = organizationId ? `org:${organizationId}:${user.id}` : `user:${user.id}`;
    const allowed = this.store.check(key, limit);
    if (!allowed) {
      throw new HttpException(
        { message: 'تعداد درخواست\u200cها بیش از حد مجاز است. لطفاً کمی صبر کنید.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return next.handle();
  }
}
