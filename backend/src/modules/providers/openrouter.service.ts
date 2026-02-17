import { Injectable, Logger } from '@nestjs/common';
import { AIProvider, getModelCost } from './ai-provider.interface';
import { AiProviderConfigService } from '../ai-providers/ai-provider-config.service';

@Injectable()
export class OpenRouterService implements AIProvider {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  constructor(private aiProviderConfig: AiProviderConfigService) {}

  private async getApiKey(): Promise<string> {
    const fromDb = await this.aiProviderConfig.getApiKeyForProvider('openrouter');
    return fromDb || process.env.OPENROUTER_API_KEY || '';
  }

  async generateText(prompt: string, model?: string, options?: any): Promise<{ text: string; usage?: any }> {
    const apiKey = await this.getApiKey();
    const messages = options?.messages || [{ role: 'user', content: prompt }];
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aimall.ir',
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-4o-mini',
        messages,
        max_tokens: options?.maxTokens || 2000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`OpenRouter error: ${err}`);
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens } : undefined,
    };
  }

  async *streamText(prompt: string, model?: string, options?: any): AsyncGenerator<string> {
    const apiKey = await this.getApiKey();
    const messages = options?.messages || [{ role: 'user', content: prompt }];
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aimall.ir',
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-4o-mini',
        messages,
        stream: true,
        max_tokens: options?.maxTokens || 2000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`OpenRouter stream error: ${err}`);
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip unparseable chunks
        }
      }
    }
  }

  async listModels(service?: string): Promise<{ id: string; name: string; description?: string; coinCost?: number }[]> {
    switch (service) {
      case 'image':
        return [
          { id: 'flux', name: 'Flux', description: 'مدل پیشرفته تولید تصویر', coinCost: 5 },
          { id: 'flux-realism', name: 'Flux Realism', description: 'تصاویر فوق واقع‌گرایانه', coinCost: 5 },
          { id: 'flux-anime', name: 'Flux Anime', description: 'سبک انیمه و کارتونی', coinCost: 5 },
          { id: 'flux-3d', name: 'Flux 3D', description: 'رندر سه‌بعدی', coinCost: 5 },
          { id: 'flux-pixel', name: 'Flux Pixel Art', description: 'پیکسل آرت و بازی', coinCost: 5 },
          { id: 'turbo', name: 'Turbo', description: 'تولید سریع با کیفیت خوب', coinCost: 3 },
        ];
      case 'tts':
        return [
          { id: 'openai/tts-1', name: 'OpenAI TTS-1', description: 'تبدیل متن به گفتار سریع', coinCost: 3 },
          { id: 'openai/tts-1-hd', name: 'OpenAI TTS-1 HD', description: 'کیفیت بالای صدا', coinCost: 5 },
          { id: 'google/cloud-tts', name: 'Google Cloud TTS', description: 'موتور گفتار Google', coinCost: 2 },
          { id: 'elevenlabs/multilingual-v2', name: 'ElevenLabs v2', description: 'صدای طبیعی چندزبانه', coinCost: 5 },
        ];
      case 'stt':
        return [
          { id: 'openai/whisper-large-v3', name: 'Whisper Large v3', description: 'دقیق‌ترین مدل تشخیص گفتار', coinCost: 3 },
          { id: 'openai/whisper-1', name: 'Whisper v1', description: 'مدل پایه تشخیص گفتار', coinCost: 2 },
          { id: 'google/speech-to-text', name: 'Google STT', description: 'موتور تشخیص گفتار Google', coinCost: 2 },
          { id: 'deepgram/nova-2', name: 'Deepgram Nova 2', description: 'سریع و دقیق', coinCost: 2 },
        ];
      case 'text':
      case 'chat':
      default:
        return [
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'مدل سریع و اقتصادی OpenAI', coinCost: getModelCost('openai/gpt-4o-mini') },
          { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'مدل پایه OpenAI', coinCost: getModelCost('openai/gpt-3.5-turbo') },
          { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'مدل سریع Anthropic', coinCost: getModelCost('anthropic/claude-3-haiku') },
          { id: 'google/gemini-pro', name: 'Gemini Pro', description: 'مدل حرفه‌ای Google', coinCost: getModelCost('google/gemini-pro') },
          { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B', description: 'مدل متن‌باز Meta', coinCost: getModelCost('meta-llama/llama-3-8b-instruct') },
        ];
    }
  }
}
