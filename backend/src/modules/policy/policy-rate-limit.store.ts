import { Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000; // 1 minute

interface WindowState {
  count: number;
  windowStart: number;
}

/** In-memory store for per-user rate limiting when Policy returns rateLimitPerMinute. */
@Injectable()
export class PolicyRateLimitStore {
  private readonly windows = new Map<string, WindowState>();

  check(key: string, limitPerMinute: number): boolean {
    if (limitPerMinute <= 0) return true;
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
    return state.count <= limitPerMinute;
  }
}
