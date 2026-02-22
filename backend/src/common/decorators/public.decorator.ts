import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'isPublic';

/** مسیرهایی که با این دکوراتور علامت‌گذاری شوند از ApiKeyAuthGuard عبور می‌کنند (بدون نیاز به توکن). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
