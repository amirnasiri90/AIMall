import { Injectable, Logger } from '@nestjs/common';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

@Injectable()
export class OpenAIImagesService {
  private readonly logger = new Logger(OpenAIImagesService.name);

  /** Map width x height to DALL-E 3 size (1024x1024, 1792x1024, 1024x1792). */
  private toDallE3Size(w: number, h: number): string {
    if (w >= h) {
      if (w >= 1700) return '1792x1024';
      return '1024x1024';
    }
    if (h >= 1700) return '1024x1792';
    return '1024x1024';
  }

  /** مدل‌های DALL-E که از پارامتر size پشتیبانی می‌کنند. */
  private readonly dallEModels = ['dall-e-2', 'dall-e-3'];

  async generate(apiKey: string, prompt: string, options: { w: number; h: number; model?: string; n?: number }): Promise<string[]> {
    const requested = options.model ?? 'dall-e-3';
    const model = this.dallEModels.includes(requested) ? (requested === 'dall-e-2' ? 'dall-e-2' : 'dall-e-3') : requested;
    const n = Math.min(Math.max(options.n ?? 1, 1), 4);
    const size = this.dallEModels.includes(model)
      ? (model === 'dall-e-3' ? this.toDallE3Size(options.w, options.h) : '1024x1024')
      : '1024x1024';

    const body: Record<string, unknown> = {
      model,
      prompt,
      n,
      size,
    };
    if (model === 'dall-e-3') {
      body.quality = 'standard';
      body.response_format = 'url';
    }

    const res = await fetch(OPENAI_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`OpenAI Images error: ${err}`);
      throw new Error(`OpenAI Images failed: ${res.status}`);
    }

    const data = await res.json();
    const urls = (data.data as { url?: string }[]).map((d) => d.url).filter((u): u is string => !!u);
    return urls;
  }
}
