import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

const DIM = 32;
const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const OPENROUTER_EMBED_URL = 'https://openrouter.ai/api/v1/embeddings';
const EMBED_MODEL = 'text-embedding-3-small';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openaiKey = process.env.OPENAI_API_KEY || '';
  private readonly openrouterKey = process.env.OPENROUTER_API_KEY || '';

  private useRealEmbedding(): boolean {
    return !!(this.openaiKey || this.openrouterKey);
  }

  /**
   * Embed text: uses OpenAI or OpenRouter when API key is set, otherwise pseudo-embedding.
   */
  async embed(text: string): Promise<number[]> {
    if (this.openaiKey) {
      try {
        return await this.embedOpenAI(text);
      } catch (e: any) {
        this.logger.warn(`OpenAI embedding failed: ${e?.message}, falling back to pseudo`);
      }
    }
    if (this.openrouterKey) {
      try {
        return await this.embedOpenRouter(text);
      } catch (e: any) {
        this.logger.warn(`OpenRouter embedding failed: ${e?.message}, falling back to pseudo`);
      }
    }
    return this.pseudoEmbed(text);
  }

  private async embedOpenAI(text: string): Promise<number[]> {
    const res = await fetch(OPENAI_EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings: ${res.status}`);
    const data = await res.json();
    const vec = data?.data?.[0]?.embedding;
    if (!Array.isArray(vec)) throw new Error('Invalid OpenAI embedding response');
    return vec;
  }

  private async embedOpenRouter(text: string): Promise<number[]> {
    const res = await fetch(OPENROUTER_EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aimall.ir',
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
    });
    if (!res.ok) throw new Error(`OpenRouter embeddings: ${res.status}`);
    const data = await res.json();
    const vec = data?.data?.[0]?.embedding;
    if (!Array.isArray(vec)) throw new Error('Invalid OpenRouter embedding response');
    return vec;
  }

  private pseudoEmbed(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    const out: number[] = [];
    for (let i = 0; i < DIM; i++) {
      const slice = hash.slice((i * 2) % 62, (i * 2) % 62 + 4);
      out.push((parseInt(slice, 16) % 1000) / 500 - 1);
    }
    const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
    return out.map((x) => x / norm);
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }
}
