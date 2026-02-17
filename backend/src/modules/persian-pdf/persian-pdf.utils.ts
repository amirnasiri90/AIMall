/**
 * نرمال‌سازی متن فارسی: ي/ك عربی → ی/ک فارسی و حذف فاصله‌های اضافی
 */
export function normalizePersianText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\u0643/g, '\u06A9') // ك → ک
    .replace(/\u064A/g, '\u06CC') // ي → ی
    .replace(/\u06CC\u0647\u0627/g, '\u06CC\u0647\u0627') // preserve یها if needed
    .replace(/\s+/g, ' ')
    .trim();
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const EN_DIGITS = '0123456789';

/**
 * تبدیل اعداد به فارسی (۰-۹) یا لاتین (0-9)
 */
export function convertDigits(text: string, to: 'fa' | 'en'): string {
  if (!text || typeof text !== 'string') return '';
  if (to === 'fa') {
    return text.replace(/[0-9]/g, (d) => FA_DIGITS[parseInt(d, 10)]);
  }
  return text.replace(/[۰-۹]/g, (d) => EN_DIGITS[FA_DIGITS.indexOf(d)]);
}

const RTL_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LTR_RANGE = /[a-zA-Z0-9]/;

function isRtlChar(c: string): boolean {
  return RTL_RANGE.test(c);
}

function isLtrChar(c: string): boolean {
  return LTR_RANGE.test(c);
}

/**
 * فقط بخش‌های راست‌به‌چپ (فارسی/عربی) را برعکس می‌کند تا متن انگلیسی برعکس نشود.
 * کاراکترهای خنثی (فاصله، نقطه) جزو اجرای قبلی در نظر گرفته می‌شوند.
 */
export function reverseForRtlDisplay(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const segments: string[] = [];
  let current = '';
  let currentRtl: boolean | null = null;
  for (const c of text) {
    const rtl = isRtlChar(c);
    const ltr = isLtrChar(c);
    const neutral = !rtl && !ltr;
    let runIsRtl: boolean;
    if (neutral && currentRtl !== null) {
      runIsRtl = currentRtl;
      current += c;
      continue;
    }
    if (rtl) runIsRtl = true;
    else if (ltr) runIsRtl = false;
    else {
      runIsRtl = currentRtl ?? false;
      current += c;
      continue;
    }
    if (currentRtl === null) {
      currentRtl = runIsRtl;
      current = c;
      continue;
    }
    if (runIsRtl === currentRtl) {
      current += c;
    } else {
      segments.push(currentRtl ? [...current].reverse().join('') : current);
      current = c;
      currentRtl = runIsRtl;
    }
  }
  if (current.length) {
    segments.push(currentRtl ? [...current].reverse().join('') : current);
  }
  return segments.join('');
}

/**
 * Escape برای استفاده در HTML (جلوگیری از XSS)
 */
export function escapeHtml(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return raw.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}
