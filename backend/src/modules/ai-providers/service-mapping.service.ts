import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ServiceSection = 'chat' | 'text' | 'image' | 'video' | 'tts' | 'stt';

export interface MappingEntry {
  providerKey: string;
  modelId: string;
  label?: string;
}

export type ServiceMappingPayload = Partial<Record<ServiceSection, MappingEntry[]>>;

const DEFAULT_MAPPING: ServiceMappingPayload = {
  chat: [
    { providerKey: 'openrouter', modelId: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenRouter)' },
    { providerKey: 'openrouter', modelId: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (OpenRouter)' },
  ],
  text: [
    { providerKey: 'openrouter', modelId: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  image: [
    { providerKey: 'openrouter', modelId: 'flux', label: 'Flux' },
  ],
  video: [
    { providerKey: 'veo', modelId: 'veo', label: 'Google Veo' },
    { providerKey: 'luma', modelId: 'luma', label: 'Luma Dream Machine' },
    { providerKey: 'nanobenana', modelId: 'nanobenana', label: 'NanoBenana' },
  ],
  tts: [
    { providerKey: 'openrouter', modelId: 'openai/gpt-audio-mini', label: 'GPT Audio Mini (OpenRouter)' },
    { providerKey: 'openai', modelId: 'openai/tts-1', label: 'OpenAI TTS' },
    { providerKey: 'elevenlabs', modelId: 'elevenlabs/multilingual-v2', label: 'ElevenLabs (چندزبانه)' },
    { providerKey: 'openrouter', modelId: 'openai/gpt-4o-audio-preview', label: 'GPT-4o Audio (OpenRouter)' },
    { providerKey: 'openrouter', modelId: 'openai/gpt-4o-mini-audio-preview', label: 'GPT-4o Mini Audio (OpenRouter)' },
  ],
  stt: [
    { providerKey: 'openrouter', modelId: 'openai/whisper-large-v3', label: 'Whisper' },
  ],
};

const SETTING_KEY = 'service_mapping';

@Injectable()
export class ServiceMappingService {
  constructor(private prisma: PrismaService) {}

  async getMapping(): Promise<ServiceMappingPayload> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    if (!row?.value) return DEFAULT_MAPPING;
    try {
      return { ...DEFAULT_MAPPING, ...JSON.parse(row.value) };
    } catch {
      return DEFAULT_MAPPING;
    }
  }

  async setMapping(payload: ServiceMappingPayload) {
    const current = await this.getMapping();
    const merged: ServiceMappingPayload = {
      chat: payload.chat ?? current.chat,
      text: payload.text ?? current.text,
      image: payload.image ?? current.image,
      video: payload.video ?? current.video,
      tts: payload.tts ?? current.tts,
      stt: payload.stt ?? current.stt,
    };
    const value = JSON.stringify(merged);
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value, category: 'provider' },
      update: { value },
    });
    return merged;
  }

  async getModelsForSection(section: ServiceSection): Promise<MappingEntry[]> {
    const mapping = await this.getMapping();
    return mapping[section] || [];
  }
}
