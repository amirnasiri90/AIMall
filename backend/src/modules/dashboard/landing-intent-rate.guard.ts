import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LandingIntentRateStore } from './landing-intent-rate.store';

@Injectable()
export class LandingIntentRateGuard implements CanActivate {
  constructor(private readonly rateStore: LandingIntentRateStore) {}

  private normalizePhone(value: string): string {
    if (typeof value !== 'string') return '';
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    let s = value.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
    s = s.replace(/\D/g, '');
    if (s.length === 10 && s.startsWith('9')) s = '0' + s;
    if (s.length === 12 && s.startsWith('989')) s = '0' + s.slice(2);
    return s;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const raw = request.body?.phone;
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      throw new HttpException(
        { message: 'شماره موبایل الزامی است' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const phone = this.normalizePhone(raw.trim());
    if (!/^09\d{9}$/.test(phone)) {
      throw new HttpException(
        { message: 'شماره موبایل معتبر وارد کنید (مثال: 09123456789)' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const allowed = this.rateStore.checkAndIncrement(phone);
    if (!allowed) {
      throw new HttpException(
        { message: 'تعداد درخواست با این شماره زیاد است؛ یک دقیقه صبر کنید.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
