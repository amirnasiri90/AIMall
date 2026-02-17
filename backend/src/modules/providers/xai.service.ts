import { Injectable, Logger } from '@nestjs/common';

const BASE_URL = 'https://api.x.ai/v1';

/** grok-2 is deprecated; map to current model so old service mappings keep working */
function resolveModel(model?: string): string {
  const m = model || 'grok-3-mini';
  if (m === 'grok-2') return 'grok-3-mini';
  return m;
}

@Injectable()
export class XaiService {
  private readonly logger = new Logger(XaiService.name);

  async generateText(apiKey: string, prompt: string, model?: string, options?: any): Promise<{ text: string; usage?: any }> {
    const messages = options?.messages || [{ role: 'user', content: prompt }];
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolveModel(model),
        messages,
        max_tokens: options?.maxTokens || 2000,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`XAI error: ${err}`);
      if (res.status === 403 && (err.includes('credits') || err.includes('licenses') || err.includes('permission'))) {
        throw new Error('اکانت X.AI اعتبار یا لایسنس ندارد. در console.x.ai اعتبار یا پلن خریداری کنید.');
      }
      throw new Error(`XAI API error: ${res.status}`);
    }
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens } : undefined,
    };
  }

  async *streamText(apiKey: string, prompt: string, model?: string, options?: any): AsyncGenerator<string> {
    const messages = options?.messages || [{ role: 'user', content: prompt }];
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolveModel(model),
        messages,
        stream: true,
        max_tokens: options?.maxTokens || 2000,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`XAI stream error: ${err}`);
      if (res.status === 403 && (err.includes('credits') || err.includes('licenses') || err.includes('permission'))) {
        throw new Error('اکانت X.AI اعتبار یا لایسنس ندارد. در console.x.ai اعتبار یا پلن خریداری کنید.');
      }
      throw new Error(`XAI API error: ${res.status}`);
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
        } catch { /* skip */ }
      }
    }
  }
}
