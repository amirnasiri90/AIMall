import { Injectable, Logger } from '@nestjs/common';
import { IAudioProvider, TtsResult, TtsOptions } from '../audio-provider.interface';

/** مدل TTS OpenRouter با خروجی استریم (gpt-4o-mini-tts روی OpenRouter نیست؛ از gpt-audio-mini استفاده می‌شود) */
const OPENROUTER_TTS_MODEL = 'openai/gpt-audio-mini';

const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

@Injectable()
export class OpenRouterTtsProvider implements IAudioProvider {
  readonly name = 'openrouter-tts';
  private readonly logger = new Logger(OpenRouterTtsProvider.name);

  isAvailable(): boolean {
    return true;
  }

  async textToSpeech(text: string, voice?: string, _model?: string, options?: TtsOptions): Promise<TtsResult> {
    const apiKey = options?.apiKey;
    if (!apiKey) throw new Error('کلید OpenRouter برای TTS تنظیم نشده است');

    const voiceName = voice && VOICES.includes(voice) ? voice : 'alloy';

    this.logger.log(`OpenRouter TTS request: model=${OPENROUTER_TTS_MODEL} voice=${voiceName} textLength=${text.length} stream=true`);

    const body = {
      model: OPENROUTER_TTS_MODEL,
      messages: [{ role: 'user', content: text }],
      modalities: ['text', 'audio'],
      stream: true,
      ...(voiceName && { audio: { voice: voiceName, format: 'mp3' } }),
    };

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://aimall.local',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`OpenRouter TTS error: ${res.status} ${errText}`);
      let msg = `OpenRouter TTS: ${res.status}`;
      try {
        const j = JSON.parse(errText);
        if (j?.error?.message) msg += ` — ${j.error.message}`;
        else if (typeof j?.message === 'string') msg += ` — ${j.message}`;
        else if (errText.length < 200) msg += ` — ${errText}`;
      } catch {
        if (errText.length < 200) msg += ` — ${errText}`;
      }
      throw new Error(msg);
    }

    if (!res.body) throw new Error('بدنهٔ پاسخ خالی است');

    const audioChunks: string[] = [];
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
        try {
          const data = JSON.parse(trimmed.slice(6)) as any;
          const delta = data?.choices?.[0]?.delta;
          if (!delta) continue;
          if (delta.audio?.data) audioChunks.push(delta.audio.data);
          else if (typeof delta.audio === 'string') audioChunks.push(delta.audio);
          else if (delta.content && Array.isArray(delta.content)) {
            const audioPart = delta.content.find((c: any) => c?.type === 'audio' || c?.type === 'output_audio');
            if (audioPart?.data) audioChunks.push(audioPart.data);
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
    if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
      try {
        const data = JSON.parse(buffer.trim().slice(6)) as any;
        const delta = data?.choices?.[0]?.delta;
        if (delta?.audio?.data) audioChunks.push(delta.audio.data);
        else if (typeof delta?.audio === 'string') audioChunks.push(delta.audio);
      } catch {
        // ignore
      }
    }

    const base64 = audioChunks.join('');
    if (!base64) {
      this.logger.warn('OpenRouter TTS stream had no audio chunks');
      throw new Error('خروجی صوتی از OpenRouter دریافت نشد. مدل ممکن است فقط ورودی صوتی را پشتیبانی کند.');
    }

    const audioDataUrl = base64.startsWith('data:') ? base64 : `data:audio/mpeg;base64,${base64}`;
    const duration = Math.round(text.length * 0.06 * 100) / 100;
    this.logger.log(`OpenRouter TTS ok: ${audioChunks.length} chunks, base64Length=${base64.length}`);

    return {
      audioUrl: audioDataUrl,
      duration,
      model: OPENROUTER_TTS_MODEL,
    };
  }
}
