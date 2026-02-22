import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TEXT_COSTS: Record<string, number> = {
  'openai/gpt-4o-mini': 1,
  'openai/gpt-3.5-turbo': 1,
  'anthropic/claude-3-haiku': 2,
  'google/gemini-pro': 2,
  'google/gemini-2.0-flash-001': 2,
  'meta-llama/llama-3-8b-instruct': 1,
  'meta-llama/llama-3.1-8b-instruct': 1,
  'anthropic/claude-3.5-sonnet': 5,
  'openai/gpt-4o': 5,
};
const DEFAULT_IMAGE_COSTS: Record<string, number> = {
  flux: 5,
  'flux-realism': 5,
  'flux-anime': 5,
  turbo: 3,
};
const DEFAULT_TTS_COSTS: Record<string, number> = {
  'openai/tts-1': 3,
  'openai/tts-1-hd': 5,
  'google/cloud-tts': 2,
  'elevenlabs/multilingual-v2': 5,
};
const DEFAULT_STT_COSTS: Record<string, number> = {
  'openai/whisper-large-v3': 3,
  'openai/whisper-1': 2,
  'google/speech-to-text': 2,
  'deepgram/nova-2': 2,
};

const KEYS = {
  COIN_PRICE_IRR: 'coin_price_irr',
  TEXT_MODEL_COSTS: 'text_model_costs',
  IMAGE_MODEL_COSTS: 'image_model_costs',
  TTS_MODEL_COSTS: 'tts_model_costs',
  STT_MODEL_COSTS: 'stt_model_costs',
} as const;

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getCoinPriceIRR(): Promise<number> {
    const s = await this.prisma.systemSetting.findUnique({ where: { key: KEYS.COIN_PRICE_IRR } });
    if (s?.value) {
      const n = Number(s.value);
      if (!Number.isNaN(n)) return n;
    }
    return 1000;
  }

  async setCoinPriceIRR(value: number): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: KEYS.COIN_PRICE_IRR },
      create: { key: KEYS.COIN_PRICE_IRR, value: String(value), category: 'pricing', description: 'قیمت هر سکه (ریال)' },
      update: { value: String(value) },
    });
  }

  private async getModelCostsJson(key: string): Promise<Record<string, number>> {
    const s = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (s?.value) {
      try {
        const o = JSON.parse(s.value);
        if (o && typeof o === 'object') return o as Record<string, number>;
      } catch {}
    }
    return {};
  }

  async getTextModelCost(modelId: string): Promise<number> {
    const overrides = await this.getModelCostsJson(KEYS.TEXT_MODEL_COSTS);
    if (overrides[modelId] != null) return overrides[modelId];
    return DEFAULT_TEXT_COSTS[modelId] ?? 2;
  }

  async getImageModelCost(modelId?: string): Promise<number> {
    const overrides = await this.getModelCostsJson(KEYS.IMAGE_MODEL_COSTS);
    const id = modelId || 'flux';
    if (overrides[id] != null) return overrides[id];
    return DEFAULT_IMAGE_COSTS[id] ?? 5;
  }

  async getTtsModelCost(modelId?: string): Promise<number> {
    const overrides = await this.getModelCostsJson(KEYS.TTS_MODEL_COSTS);
    if (modelId && overrides[modelId] != null) return overrides[modelId];
    return DEFAULT_TTS_COSTS[modelId ?? ''] ?? 3;
  }

  async getSttModelCost(modelId?: string): Promise<number> {
    const overrides = await this.getModelCostsJson(KEYS.STT_MODEL_COSTS);
    if (modelId && overrides[modelId] != null) return overrides[modelId];
    return DEFAULT_STT_COSTS[modelId ?? ''] ?? 2;
  }

  async getAllModelCosts(): Promise<{
    text: Record<string, number>;
    image: Record<string, number>;
    tts: Record<string, number>;
    stt: Record<string, number>;
  }> {
    const [text, image, tts, stt] = await Promise.all([
      this.getModelCostsJson(KEYS.TEXT_MODEL_COSTS),
      this.getModelCostsJson(KEYS.IMAGE_MODEL_COSTS),
      this.getModelCostsJson(KEYS.TTS_MODEL_COSTS),
      this.getModelCostsJson(KEYS.STT_MODEL_COSTS),
    ]);
    return {
      text: { ...DEFAULT_TEXT_COSTS, ...text },
      image: { ...DEFAULT_IMAGE_COSTS, ...image },
      tts: { ...DEFAULT_TTS_COSTS, ...tts },
      stt: { ...DEFAULT_STT_COSTS, ...stt },
    };
  }

  async setModelCosts(
    service: 'text' | 'image' | 'tts' | 'stt',
    costs: Record<string, number>,
  ): Promise<void> {
    const key = KEYS[`${service.toUpperCase()}_MODEL_COSTS` as keyof typeof KEYS];
    const desc = { text: 'سکه هر مدل متن', image: 'سکه هر مدل تصویر', tts: 'سکه هر مدل TTS', stt: 'سکه هر مدل STT' };
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(costs), category: 'model_costs', description: desc[service] },
      update: { value: JSON.stringify(costs) },
    });
  }

  async getSetting(key: string): Promise<string | null> {
    const s = await this.prisma.systemSetting.findUnique({ where: { key } });
    return s?.value ?? null;
  }

  async upsertSetting(key: string, value: string, category = 'general', description?: string): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, category, description: description ?? key },
      update: { value },
    });
  }
}
