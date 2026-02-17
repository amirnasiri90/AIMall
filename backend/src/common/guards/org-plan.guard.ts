import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OrgPlanGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.hasOrganizationPlan) {
      throw new ForbiddenException(
        'برای استفاده از بخش سازمان‌ها باید پلن سازمانی خریداری کنید.',
      );
    }
    return true;
  }
}
