import { Injectable } from '@nestjs/common';

const SMS_BASE = 'https://api.sms-webservice.com/api/V3';

const SMS_IR_BASE = 'https://api.sms.ir/v1';

/** متن الگوی یک‌پارامتری برای کد ورود — در پنل sms.ir با متغیر #code# تعریف شده؛ شناسه قالب در SMS_IR_TEMPLATE_ID */
export const OTP_TEMPLATE_TEXT = `آیفو
کد ورود شما به پنل : #code#`;

/**
 * سرویس ارسال پیامک — پشتیبانی از sms.ir (الگو با شناسه) و sms-webservice.com
 */
@Injectable()
export class SmsService {
  /**
   * ارسال کد تأیید با قالب sms.ir (یک پارامتر = کد ورود).
   * Parameters در sms.ir آرایهٔ { name, value } است؛ نام متغیر قالب ما #code# است پس name: "code".
   */
  async sendVerifyViaSmsIr(
    recipient: string,
    templateId: string | number,
    parameters: Array<{ name: string; value: string }>,
  ): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    const apiKey = process.env.SMS_IR_API_KEY;
    if (!apiKey) return { ok: false, error: 'SMS_IR_API_KEY not configured' };
    const normalized = this.normalizePhone(recipient);
    if (!normalized) return { ok: false, error: 'شماره تلفن نامعتبر است' };
    const mobile = normalized.startsWith('0') ? normalized.slice(1) : normalized;
    try {
      const res = await fetch(`${SMS_IR_BASE}/send/verify/`, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Mobile: mobile,
          TemplateId: Number(templateId),
          Parameters: parameters,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data?.messageId != null || data?.data != null)) {
        return { ok: true, messageId: data.messageId ?? data.data?.messageId };
      }
      const errMsg = data?.message ?? data?.Message ?? data?.error ?? data?.title ?? (typeof data === 'string' ? data : null);
      return { ok: false, error: errMsg ? String(errMsg) : `خطای sms.ir (${res.status})` };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'خطا در ارسال پیامک' };
    }
  }

  /**
   * ارسال با الگو sms-webservice.com (خط خدماتی خود سامانه).
   */
  async sendWithTemplate(
    recipient: string,
    params: [string, string?, string?],
  ): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    const apiKey = process.env.SMS_API_KEY;
    const templateKey = process.env.SMS_TEMPLATE_KEY;
    if (!apiKey) return { ok: false, error: 'SMS_API_KEY not configured' };
    if (!templateKey) return { ok: false, error: 'SMS_TEMPLATE_KEY not configured for template send' };
    const normalized = this.normalizePhone(recipient);
    if (!normalized) return { ok: false, error: 'شماره تلفن نامعتبر است' };
    const destination = normalized.startsWith('0') ? normalized.slice(1) : normalized;
    try {
      const url = new URL(`${SMS_BASE}/SendTokenSingle`);
      url.searchParams.set('ApiKey', apiKey);
      url.searchParams.set('TemplateKey', templateKey);
      url.searchParams.set('Destination', destination);
      url.searchParams.set('p1', params[0] ?? '');
      url.searchParams.set('p2', params[1] ?? '');
      url.searchParams.set('p3', params[2] ?? '');
      const res = await fetch(url.toString(), { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data?.id != null || data?.Id != null)) {
        return { ok: true, messageId: data.id ?? data.Id };
      }
      const errMsg = data?.message ?? data?.Message ?? data?.error ?? (typeof data === 'string' ? data : null);
      return { ok: false, error: errMsg ? String(errMsg) : `خطای سرویس پیامک (${res.status})` };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'خطا در ارسال پیامک' };
    }
  }

  /** ارسال متن ساده با شماره ثابت (Sender) */
  async send(recipient: string, text: string): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    const apiKey = process.env.SMS_API_KEY;
    const sender = process.env.SMS_SENDER || '3000';
    if (!apiKey) {
      return { ok: false, error: 'SMS_API_KEY not configured' };
    }
    const normalized = this.normalizePhone(recipient);
    if (!normalized) {
      return { ok: false, error: 'شماره تلفن نامعتبر است' };
    }
    try {
      const url = new URL(`${SMS_BASE}/Send`);
      url.searchParams.set('ApiKey', apiKey);
      url.searchParams.set('Text', text);
      url.searchParams.set('Sender', String(sender));
      url.searchParams.set('Recipients', normalized);
      const res = await fetch(url.toString(), { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data?.id != null || data?.Id != null)) {
        return { ok: true, messageId: data.id ?? data.Id };
      }
      const errMsg = data?.message ?? data?.Message ?? data?.error ?? (typeof data === 'string' ? data : null);
      return { ok: false, error: errMsg ? String(errMsg) : `خطای سرویس پیامک (${res.status})` };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'خطا در ارسال پیامک' };
    }
  }

  /** شماره را به فرمت 09xxxxxxxxx نرمال می‌کند */
  normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('09')) return digits;
    if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
    if (digits.length === 12 && digits.startsWith('989')) return '0' + digits.slice(2);
    if (digits.length === 11 && digits.startsWith('09')) return digits;
    return null;
  }
}
