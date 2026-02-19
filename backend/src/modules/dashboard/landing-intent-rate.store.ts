import { Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_PHONE = 5;

interface WindowState {
  count: number;
  windowStart: number;
}

/** محدودیت نرخ درخواست بر اساس شماره موبایل برای endpoint تحلیل قصد صفحهٔ اول (بدون لاگین). */
@Injectable()
export class LandingIntentRateStore {
  private readonly windows = new Map<string, WindowState>();

  /** اگر بیش از حد مجاز درخواست با این شماره زده شده باشد false برمی‌گرداند. */
  checkAndIncrement(phone: string): boolean {
    const key = phone.trim();
    if (!key) return false;
    const now = Date.now();
    const state = this.windows.get(key);
    if (!state) {
      this.windows.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (now - state.windowStart >= WINDOW_MS) {
      state.count = 1;
      state.windowStart = now;
      return true;
    }
    state.count++;
    return state.count <= MAX_REQUESTS_PER_PHONE;
  }
}
