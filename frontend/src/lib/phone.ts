/** ارقام فارسی به انگلیسی برای پردازش */
const FA = '۰۱۲۳۴۵۶۷۸۹';

/**
 * شماره موبایل را نرمال می‌کند: ارقام فارسی → انگلیسی، حذف غیرعددی، فرمت 09xxxxxxxxx
 */
export function normalizePhone(v: string): string {
  let s = v.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)));
  const d = s.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('09')) return d;
  if (d.length === 10 && d.startsWith('9')) return '0' + d;
  if (d.length === 12 && d.startsWith('989')) return '0' + d.slice(2);
  return d.length === 11 ? d : v;
}

/**
 * آیا رشته بعد از نرمال، یک شماره موبایل معتبر ایران است (۱۱ رقم، شروع با 09)
 */
export function isValidIranMobile(value: string): boolean {
  const normalized = normalizePhone(value.trim());
  return normalized.length === 11 && normalized.startsWith('09');
}

/**
 * تبدیل اعداد انگلیسی به ارقام فارسی برای نمایش
 */
export function toPersianDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => FA[+d]);
}
