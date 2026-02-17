import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../prisma/prisma.service';

export const JWT_OR_API_KEY = 'jwtOrApiKey';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private apiKeysService: ApiKeysService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const apiKeyHeader = request.headers['x-api-key'];
    const queryToken = request.query?.token;
    const path = (request.url || request.path || '').split('?')[0];

    // Accept token in query only for SSE/stream routes (EventSource cannot send custom headers easily)
    const allowQueryToken = /\/stream$|\/stream\//.test(path);

    let token: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (apiKeyHeader) {
      token = apiKeyHeader;
    } else if (allowQueryToken && typeof queryToken === 'string' && queryToken) {
      token = queryToken;
    }

    if (!token) throw new UnauthorizedException('توکن یا API key ارسال نشده');

    if (token.startsWith('aimall_')) {
      const result = await this.apiKeysService.validateAndGetUser(token);
      if (!result) throw new UnauthorizedException('API key نامعتبر');
      const user = await this.prisma.user.findUnique({
        where: { id: result.userId },
        select: { id: true, email: true, name: true, role: true, coins: true },
      });
      if (!user) throw new UnauthorizedException('کاربر یافت نشد');
      request.user = { ...user, apiKeyScopes: result.scopes };
      return true;
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('توکن نامعتبر');
    }
  }
}
