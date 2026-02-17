import { Injectable, Logger } from '@nestjs/common';
import { IAudioProvider, TtsResult, TtsOptions } from '../audio-provider.interface';

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

@Injectable()
export class OpenAITtsProvider implements IAudioProvider {
  readonly name = 'openai-tts';
  private readonly logger = new Logger(OpenAITtsProvider.name);
  private readonly apiKey = process.env.OPENAI_API_KEY || '';

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async textToSpeech(text: string, voice?: string, model?: string, options?: TtsOptions): Promise<TtsResult> {
    const apiKey = options?.apiKey || this.apiKey;
    if (!apiKey) throw new Error('OpenAI API key not set (env or پنل مدیریت)');
    const v = voice && VOICES.includes(voice) ? voice : 'alloy';
    const body: Record<string, unknown> = {
      model: model || 'tts-1',
      input: text,
      voice: v,
    };
    if (options?.speed != null && options.speed >= 0.25 && options.speed <= 4) {
      body.speed = options.speed;
    }
    const res = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`OpenAI TTS error: ${err}`);
      throw new Error(`OpenAI TTS failed: ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString('base64');
    const duration = Math.round((buffer.length / (16000 * 2)) * 10) / 10 || Math.round(text.length * 0.05 * 100) / 100;
    return {
      audioUrl: `data:audio/mpeg;base64,${base64}`,
      duration,
      model: model || 'tts-1',
    };
  }
}
