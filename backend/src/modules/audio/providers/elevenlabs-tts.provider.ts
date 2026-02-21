import { Injectable, Logger } from '@nestjs/common';
import { IAudioProvider, TtsResult, TtsOptions } from '../audio-provider.interface';

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel (multilingual)
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

@Injectable()
export class ElevenLabsTtsProvider implements IAudioProvider {
  readonly name = 'elevenlabs-tts';
  private readonly logger = new Logger(ElevenLabsTtsProvider.name);

  async textToSpeech(text: string, voice?: string, model?: string, options?: TtsOptions): Promise<TtsResult> {
    const apiKey = options?.apiKey;
    if (!apiKey) throw new Error('ElevenLabs API key not set (پنل مدیریت → ارائه‌دهندگان)');
    const voiceId = voice && /^[a-zA-Z0-9_-]{20,}$/.test(voice) ? voice : DEFAULT_VOICE_ID;
    const modelId = model || DEFAULT_MODEL_ID;
    const stability = options?.stability != null && options.stability >= 0 && options.stability <= 1 ? options.stability : 0.5;
    const similarityBoost = options?.similarityBoost != null && options.similarityBoost >= 0 && options.similarityBoost <= 1 ? options.similarityBoost : 0.75;
    const body: Record<string, unknown> = { text, model_id: modelId };
    body.voice_settings = {
      stability,
      similarity_boost: similarityBoost,
      ...(options?.speed != null && options.speed >= 0.5 && options.speed <= 2 && { speed: options.speed }),
    };
    const url = `${ELEVENLABS_TTS_URL}/${voiceId}?output_format=mp3_44100_128`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`ElevenLabs TTS error: ${res.status} ${err.slice(0, 200)}`);
      if (res.status === 401) throw new Error('API key ElevenLabs نامعتبر است.');
      if (res.status === 429) throw new Error('محدودیت درخواست ElevenLabs. سهمیه را بررسی کنید.');
      throw new Error(`ElevenLabs TTS failed: ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString('base64');
    const duration = Math.round((buffer.length / (44100 * 2)) * 10) / 10 || Math.round(text.length * 0.05 * 100) / 100;
    return {
      audioUrl: `data:audio/mpeg;base64,${base64}`,
      duration,
      model: modelId,
    };
  }
}
