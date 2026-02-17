import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ProviderResolverService } from '../ai-providers/provider-resolver.service';
import { AiProviderConfigService } from '../ai-providers/ai-provider-config.service';
import { IAudioProvider } from './audio-provider.interface';
import { getTtsModelCost, getSttModelCost } from './audio-costs';
import { OpenAITtsProvider } from './providers/openai-tts.provider';
import { ElevenLabsTtsProvider } from './providers/elevenlabs-tts.provider';
import { OpenRouterTtsProvider } from './providers/openrouter-tts.provider';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private resolver: ProviderResolverService,
    private aiProviderConfig: AiProviderConfigService,
    @Inject('AUDIO_TTS_PROVIDER') private fallbackTtsProvider: IAudioProvider,
    @Inject('AUDIO_STT_PROVIDER') private sttProvider: IAudioProvider,
    private openaiTts: OpenAITtsProvider,
    private elevenlabsTts: ElevenLabsTtsProvider,
    private openRouterTts: OpenRouterTtsProvider,
  ) {}

  estimate(type: 'tts' | 'stt', model?: string): { estimatedCoins: number } {
    const cost = type === 'tts' ? getTtsModelCost(model) : getSttModelCost(model);
    return { estimatedCoins: cost };
  }

  async getHistory(
    userId: string,
    params?: { search?: string; from?: string; to?: string; type?: string },
  ) {
    type WhereInput = {
      userId: string;
      service: string;
      createdAt?: { gte?: Date; lte?: Date };
      metadata?: { contains: string };
      OR?: Array<{ input?: { contains: string; mode: 'insensitive' }; output?: { contains: string; mode: 'insensitive' } }>;
    };
    const where: WhereInput = {
      userId,
      service: 'audio',
    };
    if (params?.from || params?.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }
    if (params?.type && params.type !== '_all') {
      const typeKey = params.type === 'tts' ? 'tts' : 'stt';
      where.metadata = { contains: `"type":"${typeKey}"` };
    }
    if (params?.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { input: { contains: q, mode: 'insensitive' } },
        { output: { contains: q, mode: 'insensitive' } },
      ];
    }
    const list = await this.prisma.generation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return list.map((g) => ({
      id: g.id,
      type: (g.metadata && JSON.parse(g.metadata).type) || 'tts',
      input: g.input,
      output: g.output,
      model: g.model,
      coinCost: g.coinCost,
      createdAt: g.createdAt,
      metadata: g.metadata ? JSON.parse(g.metadata) : undefined,
    }));
  }

  async textToSpeech(
    userId: string,
    text: string,
    voice?: string,
    model?: string,
    options?: { speed?: number; language?: string },
  ) {
    const coinCost = getTtsModelCost(model);
    await this.usersService.deductCoins(userId, coinCost, 'تبدیل متن به گفتار', 'audio');

    const resolved = await this.resolver.resolve('tts', model);
    this.logger.log(`TTS resolve: model=${model} resolved=${resolved ? `${resolved.providerKey}/${resolved.modelId} hasKey=${!!resolved.apiKey}` : 'null'}`);

    let ttsProvider: IAudioProvider = this.fallbackTtsProvider;
    let apiKey: string | null = null;
    let modelForProvider = model && model.includes('/') ? model.split('/')[1] : model || 'tts-1';

    // OpenRouter با مدل‌های GPT Audio (Output Modalities) برای TTS
    if (resolved?.providerKey === 'openrouter' && resolved?.apiKey && resolved?.modelId) {
      this.logger.log(`TTS using OpenRouter model=${resolved.modelId}`);
      ttsProvider = this.openRouterTts;
      apiKey = resolved.apiKey;
      modelForProvider = resolved.modelId;
    } else if (resolved?.providerKey === 'elevenlabs' && resolved?.apiKey) {
      ttsProvider = this.elevenlabsTts;
      apiKey = resolved.apiKey;
      modelForProvider = model && model.includes('/') ? model.split('/')[1] : 'eleven_multilingual_v2';
    } else if (resolved?.providerKey === 'openai' && resolved?.apiKey) {
      ttsProvider = this.openaiTts;
      apiKey = resolved.apiKey;
      modelForProvider = model && model.includes('/') ? model.split('/')[1] : 'tts-1';
    } else if (resolved?.providerKey === 'openrouter' && !resolved?.apiKey) {
      // نقشه OpenRouter اما بدون کلید؛ fallback به OpenAI یا ElevenLabs
      apiKey = await this.aiProviderConfig.getApiKeyForProvider('openai');
      if (apiKey && this.openaiTts.isAvailable()) {
        ttsProvider = this.openaiTts;
        modelForProvider = model && model.includes('/') ? model.split('/')[1] : 'tts-1';
      } else {
        apiKey = await this.aiProviderConfig.getApiKeyForProvider('elevenlabs');
        if (apiKey) {
          ttsProvider = this.elevenlabsTts;
          modelForProvider = 'eleven_multilingual_v2';
        } else if (this.openaiTts.isAvailable()) {
          ttsProvider = this.openaiTts;
          modelForProvider = 'tts-1';
        }
      }
    } else if (!resolved?.apiKey) {
      apiKey = await this.aiProviderConfig.getApiKeyForProvider('openai');
      if (apiKey && this.openaiTts.isAvailable()) {
        ttsProvider = this.openaiTts;
        modelForProvider = model && model.includes('/') ? model.split('/')[1] : 'tts-1';
      } else {
        apiKey = await this.aiProviderConfig.getApiKeyForProvider('elevenlabs');
        if (apiKey) {
          ttsProvider = this.elevenlabsTts;
          modelForProvider = 'eleven_multilingual_v2';
        } else if (this.openaiTts.isAvailable()) {
          ttsProvider = this.openaiTts;
          modelForProvider = 'tts-1';
        }
      }
    } else if (resolved?.apiKey) {
      apiKey = resolved.apiKey;
      if (resolved.providerKey === 'elevenlabs') {
        ttsProvider = this.elevenlabsTts;
        modelForProvider = model && model.includes('/') ? model.split('/')[1] : 'eleven_multilingual_v2';
      } else if (resolved.providerKey === 'openai') {
        ttsProvider = this.openaiTts;
        modelForProvider = model && model.includes('/') ? model.split('/')[1] : 'tts-1';
      }
    }

    const optsWithKey = apiKey ? { ...options, apiKey } : options;
    this.logger.log(`TTS calling provider=${ttsProvider.name} modelForProvider=${modelForProvider}`);
    let audioUrl: string;
    let duration: number;
    let selectedModel: string | undefined;
    try {
      const result = await ttsProvider.textToSpeech(text, voice, modelForProvider, optsWithKey);
      audioUrl = result.audioUrl;
      duration = result.duration;
      selectedModel = result.model;
      this.logger.log(`TTS result: audioUrlLength=${audioUrl?.length} duration=${duration} model=${selectedModel}`);
    } catch (err) {
      this.logger.error(`TTS provider error: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined);
      throw err;
    }

    await this.prisma.generation.create({
      data: {
        userId,
        service: 'audio',
        input: text,
        output: audioUrl,
        model: selectedModel || 'tts',
        coinCost,
        metadata: JSON.stringify({ type: 'tts', voice, duration, model: selectedModel }),
      },
    });

    return { audioUrl, duration, model: selectedModel, coinCost };
  }

  async speechToText(userId: string, filename?: string, fileSize?: number, model?: string, fileBuffer?: Buffer, contentType?: string) {
    const coinCost = getSttModelCost(model);
    await this.usersService.deductCoins(userId, coinCost, 'تبدیل گفتار به متن', 'audio');

    const buffer = fileBuffer || Buffer.from('');
    const { text, model: selectedModel } = await this.sttProvider.speechToText!(buffer, contentType, filename, model);

    await this.prisma.generation.create({
      data: {
        userId,
        service: 'audio',
        input: filename || 'audio-upload',
        output: text,
        model: selectedModel || 'stt',
        coinCost,
        metadata: JSON.stringify({ type: 'stt', filename, fileSize, model: selectedModel }),
      },
    });

    return { text, model: selectedModel, coinCost, filename };
  }
}
