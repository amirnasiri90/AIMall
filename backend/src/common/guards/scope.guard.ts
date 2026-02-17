import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_SCOPE_KEY } from '../decorators/require-scope.decorator';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScope = this.reflector.getAllAndOverride<string>(REQUIRE_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredScope) return true;

    const { user } = context.switchToHttp().getRequest();
    const scopes: string[] = user?.apiKeyScopes;
    if (!scopes || !Array.isArray(scopes)) return true; // JWT auth, no scope check

    const hasScope = scopes.includes('*') || scopes.includes(requiredScope);
    if (!hasScope) {
      throw new ForbiddenException(`API key فاقد دسترسی scope «${requiredScope}» است`);
    }
    return true;
  }
}
