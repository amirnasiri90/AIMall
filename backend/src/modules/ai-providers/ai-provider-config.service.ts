import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptApiKey, decryptApiKey } from './api-key-cipher';

export const DEFAULT_PROVIDERS: { providerKey: string; displayName: string; category: string; sortOrder: number }[] = [
  { providerKey: 'openrouter', displayName: 'OpenRouter', category: 'chat,text', sortOrder: 1 },
  { providerKey: 'xai', displayName: 'Grok (X.AI)', category: 'chat,text,image', sortOrder: 2 },
  { providerKey: 'google_gemini', displayName: 'Google Gemini', category: 'chat,text,image', sortOrder: 3 },
  { providerKey: 'anthropic_claude', displayName: 'Anthropic Claude', category: 'chat,text', sortOrder: 4 },
  { providerKey: 'perplexity', displayName: 'Perplexity', category: 'chat,text', sortOrder: 5 },
  { providerKey: 'openai', displayName: 'OpenAI (GPT, DALL-E, Whisper)', category: 'chat,text,image,tts,stt', sortOrder: 6 },
  { providerKey: 'flux', displayName: 'Flux', category: 'image', sortOrder: 10 },
  { providerKey: 'midjourney', displayName: 'Midjourney', category: 'image', sortOrder: 11 },
  { providerKey: 'nanobenana', displayName: 'NanoBenana', category: 'image,video', sortOrder: 12 },
  { providerKey: 'veo', displayName: 'Google Veo', category: 'video', sortOrder: 20 },
  { providerKey: 'luma', displayName: 'Luma', category: 'video', sortOrder: 21 },
  { providerKey: 'elevenlabs', displayName: 'ElevenLabs', category: 'tts', sortOrder: 30 },
  { providerKey: 'deepgram', displayName: 'Deepgram', category: 'stt', sortOrder: 40 },
  { providerKey: 'azure_speech', displayName: 'Azure Speech', category: 'stt', sortOrder: 41 },
];

@Injectable()
export class AiProviderConfigService {
  constructor(private prisma: PrismaService) {}

  async ensureDefaults() {
    const count = await this.prisma.aiProviderConfig.count();
    if (count > 0) return;
    for (const p of DEFAULT_PROVIDERS) {
      await this.prisma.aiProviderConfig.upsert({
        where: { providerKey: p.providerKey },
        create: { providerKey: p.providerKey, displayName: p.displayName, category: p.category, sortOrder: p.sortOrder, isEnabled: false },
        update: {},
      }).catch(() => {});
    }
  }

  async list(): Promise<
    { id: string; providerKey: string; displayName: string; category: string; isEnabled: boolean; hasApiKey: boolean; sortOrder: number }[]
  > {
    await this.ensureDefaults();
    const rows = await this.prisma.aiProviderConfig.findMany({
      orderBy: [{ sortOrder: 'asc' }, { providerKey: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      providerKey: r.providerKey,
      displayName: r.displayName,
      category: r.category,
      isEnabled: r.isEnabled,
      hasApiKey: !!r.apiKey,
      sortOrder: r.sortOrder,
    }));
  }

  async get(id: string) {
    const row = await this.prisma.aiProviderConfig.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('ارائه‌دهنده یافت نشد');
    return {
      id: row.id,
      providerKey: row.providerKey,
      displayName: row.displayName,
      category: row.category,
      isEnabled: row.isEnabled,
      hasApiKey: !!row.apiKey,
      config: row.config ? JSON.parse(row.config) : null,
      sortOrder: row.sortOrder,
    };
  }

  async update(
    id: string,
    body: { displayName?: string; apiKey?: string; config?: object; isEnabled?: boolean },
  ) {
    const row = await this.prisma.aiProviderConfig.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('ارائه‌دهنده یافت نشد');
    const data: { displayName?: string; apiKey?: string | null; config?: string | null; isEnabled?: boolean } = {};
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.apiKey !== undefined) data.apiKey = body.apiKey === '' ? null : encryptApiKey(String(body.apiKey).trim());
    if (body.config !== undefined) data.config = body.config == null ? null : JSON.stringify(body.config);
    if (body.isEnabled !== undefined) data.isEnabled = body.isEnabled;
    const updated = await this.prisma.aiProviderConfig.update({ where: { id }, data });
    return { id: updated.id, providerKey: updated.providerKey, isEnabled: updated.isEnabled };
  }

  async testConnection(id: string, apiKeyOverride?: string): Promise<{ ok: boolean; message?: string; latencyMs?: number; responsePreview?: string }> {
    const row = await this.prisma.aiProviderConfig.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('ارائه‌دهنده یافت نشد');
    const key = apiKeyOverride ?? (row.apiKey ? decryptApiKey(row.apiKey) : null);
    if (!key) throw new BadRequestException('API Key تنظیم نشده است');
    const start = Date.now();
    try {
      const result = await this.runProviderTest(row.providerKey, key);
      return { ok: result.ok, message: result.message, latencyMs: Date.now() - start, responsePreview: result.responsePreview };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'خطا در اتصال', latencyMs: Date.now() - start };
    }
  }

  private async runProviderTest(providerKey: string, apiKey: string): Promise<{ ok: boolean; message?: string; responsePreview?: string }> {
    switch (providerKey) {
      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say "ok"' }],
            max_tokens: 5,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          if (res.status === 429) {
            return { ok: false, message: 'سهمیه یا محدودیت درخواست (۴۲۹). اعتبار OpenRouter یا مدل پایه را بررسی کنید.' };
          }
          return { ok: false, message: `HTTP ${res.status}: ${err.slice(0, 200)}` };
        }
        const data = await res.json();
        if (data.choices?.[0]?.message?.content) return { ok: true };
        return { ok: false, message: 'پاسخ نامعتبر' };
      }
      case 'xai': {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'grok-3-mini',
            messages: [{ role: 'user', content: 'Say ok' }],
            max_tokens: 5,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          if (res.status === 403 && (err.includes('credits') || err.includes('licenses') || err.includes('permission'))) {
            return {
              ok: false,
              message: 'کلید معتبر است؛ تیم/اکانت X.AI اعتبار یا لایسنس ندارد. در console.x.ai اعتبار یا پلن خریداری کنید.',
            };
          }
          return { ok: false, message: `HTTP ${res.status}: ${err.slice(0, 200)}` };
        }
        return { ok: true };
      }
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Say ok' }], max_tokens: 5 }),
        });
        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 429) {
            return {
              ok: false,
              message: 'کلید معتبر است؛ سهمیه یا اعتبار اکانت OpenAI تمام شده. در platform.openai.com بخش Billing را شارژ یا به‌روز کنید.',
            };
          }
          return { ok: false, message: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
        }
        return { ok: true };
      }
      case 'google_gemini': {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Say ok' }] }] }),
        });
        if (!res.ok) {
          const err = await res.text();
          return { ok: false, message: `HTTP ${res.status}: ${err.slice(0, 200)}` };
        }
        return { ok: true };
      }
      case 'anthropic_claude': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Say ok' }],
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          return { ok: false, message: `HTTP ${res.status}: ${err.slice(0, 200)}` };
        }
        return { ok: true };
      }
      case 'perplexity': {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [{ role: 'user', content: 'Say ok' }],
            max_tokens: 5,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          return { ok: false, message: `HTTP ${res.status}: ${err.slice(0, 200)}` };
        }
        return { ok: true };
      }
      case 'elevenlabs': {
        const key = (apiKey || '').trim();
        if (!key) return { ok: false, message: 'API key خالی است.' };
        const headers = { 'xi-api-key': key, 'Content-Type': 'application/json' };
        let responsePreview = '';

        // اول با /v1/models اعتبار کلید را چک می‌کنیم (مستندات رسمی)
        const modelsRes = await fetch('https://api.elevenlabs.io/v1/models', {
          method: 'GET',
          headers,
        });
        const modelsBody = await modelsRes.text();
        responsePreview += `GET /v1/models → HTTP ${modelsRes.status}\n`;
        if (modelsRes.ok) {
          try {
            const arr = JSON.parse(modelsBody);
            if (Array.isArray(arr)) responsePreview += `تعداد مدل‌ها: ${arr.length}\n`;
          } catch {}
        } else {
          responsePreview += (modelsBody.slice(0, 200) || modelsRes.statusText) + '\n';
        }

        const voicesUrl = 'https://api.elevenlabs.io/v1/voices';
        const res = await fetch(voicesUrl, { method: 'GET', headers });
        const contentType = res.headers.get('content-type') || '';
        const rawBody = await res.text();
        responsePreview += `\nGET ${voicesUrl}\nHTTP ${res.status} ${res.statusText}\nContent-Type: ${contentType}\n`;
        if (rawBody.length > 0) {
          const preview = rawBody.length > 1200 ? rawBody.slice(0, 1200) + '\n... (کوتاه‌شده)' : rawBody;
          try {
            const parsed = JSON.parse(rawBody);
            const voiceCount = Array.isArray(parsed?.voices) ? parsed.voices.length : Array.isArray(parsed) ? parsed.length : null;
            if (voiceCount != null) responsePreview += `تعداد صداها: ${voiceCount}\n`;
            responsePreview += `\n--- نمونه پاسخ ---\n${preview}`;
          } catch {
            responsePreview += `\n--- بدنه خام ---\n${preview}`;
          }
        }
        if (res.ok) {
          const data = await (() => {
            try {
              return JSON.parse(rawBody);
            } catch {
              return null;
            }
          })();
          const hasVoices = (data?.voices && Array.isArray(data.voices)) || Array.isArray(data);
          if (hasVoices) return { ok: true, responsePreview };
          if (data !== null && typeof data === 'object') return { ok: true, responsePreview };
          return { ok: false, message: 'پاسخ نامعتبر از API', responsePreview };
        }
        if (res.status === 401) return { ok: false, message: 'API key نامعتبر است. کلید را بدون فاصلهٔ اضافه کپی کنید و از elevenlabs.io/app/settings/api-keys یک کلید با دسترسی «Text to Speech» بسازید.', responsePreview };
        if (res.status === 429) return { ok: false, message: 'محدودیت درخواست (۴۲۹). سهمیه ElevenLabs را بررسی کنید.', responsePreview };
        if (res.status === 403) {
          const modelsOk = modelsRes.ok;
          if (modelsOk) {
            return {
              ok: true,
              message: 'کلید معتبر است (/v1/models موفق). دسترسی به لیست صداها (۴۰۳) محدود است؛ در استودیو صوت تولید TTS باید با همین کلید کار کند.',
              responsePreview,
            };
          }
          responsePreview += '\n--- تست TTS ---\n';
          const voiceId = '21m00Tcm4TlvDq8ikWAM';
          const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_32`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ text: '.', model_id: 'eleven_multilingual_v2' }),
          });
          const ttsBody = await ttsRes.text();
          responsePreview += `POST /v1/text-to-speech → HTTP ${ttsRes.status}\n`;
          if (ttsRes.ok) {
            return { ok: true, message: 'کلید معتبر است. TTS کار می‌کند؛ فقط دسترسی به لیست صداها (۴۰۳) محدود است.', responsePreview };
          }
          responsePreview += ttsBody.slice(0, 500) + (ttsBody.length > 500 ? '\n...' : '');
          const all403 = !modelsOk && res.status === 403 && ttsRes.status === 403;
          const msg = all403
            ? 'محدودیت منطقه‌ای (۴۰۳): درخواست‌ها از سمت سرور (بک‌اند) ارسال می‌شوند؛ اگر سرور در ایران است، ElevenLabs جواب نمی‌دهد. کلید را ذخیره کنید و از VPN/سرور خارج برای اجرای بک‌اند استفاده کنید، یا از TTSهای دیگر (OpenAI/OpenRouter) استفاده کنید.'
            : 'کلید برای API شناخته نشد یا دسترسی محدود است. از elevenlabs.io/app/settings/api-keys یک API key جدید بسازید (نه OAuth)، در Scope دسترسی «Text to Speech» را فعال کنید، و کلید را بدون فاصلهٔ اضافه کپی کنید.';
          return { ok: false, message: msg, responsePreview };
        }
        return { ok: false, message: `HTTP ${res.status}: ${rawBody.slice(0, 200)}`, responsePreview };
      }
      case 'flux':
      case 'midjourney':
      case 'nanobenana':
      case 'veo':
      case 'luma':
      case 'deepgram':
      case 'azure_speech':
        return { ok: true, message: 'کلید ذخیره شد.' };
      default:
        return { ok: true };
    }
  }

  async getApiKeyForProvider(providerKey: string): Promise<string | null> {
    const row = await this.prisma.aiProviderConfig.findUnique({
      where: { providerKey, isEnabled: true },
      select: { apiKey: true },
    });
    const fromDb = row?.apiKey ? decryptApiKey(row.apiKey) : null;
    // استودیو صوت و سایر سرویس‌ها از همین تابع کلید می‌گیرند؛ در صورت نبود کلید در DB از env استفاده می‌شود
    if (fromDb) return fromDb;
    if (providerKey === 'openrouter') return process.env.OPENROUTER_API_KEY?.trim() || null;
    return null;
  }

  /** For health checks: list configs that have API key and are enabled. */
  async getConfigsWithKeys(): Promise<{ id: string; providerKey: string; displayName: string }[]> {
    const rows = await this.prisma.aiProviderConfig.findMany({
      where: { isEnabled: true, apiKey: { not: null } },
      select: { id: true, providerKey: true, displayName: true },
    });
    return rows;
  }
}
