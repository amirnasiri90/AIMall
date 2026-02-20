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

  /** نام‌های فارسی برای صداهای شناخته‌شده ElevenLabs (voice_id → نام فارسی) */
  private static readonly ELEVENLABS_VOICE_NAMES_FA: Record<string, string> = {
    '21m00Tcm4TlvDq8ikWAM': 'راشل',
    EXAVITQu4vr4xnSDxMaL: 'بلا',
    ErXwobaYiN019PkySvjV: 'آنتونی',
    MF3mGyEYCl7XYWbV9V6O: 'الی',
    TxGEqnHWrfWFTfGW9XjX: 'جاش',
    VR6AewLTigWG4xSOukaG: 'آرنولد',
    pNInz6obpgDQGcFmaJgB: 'آدم',
    yoZ06aMxZJJ28mfd3POQ: 'سام',
    OnwK4e9ZLuTAKqWW03F9: 'دانیل',
    ThT5KcBeYPX3keUQqHPh: 'دوروتی',
    S5bm5AcM0BmbtNj1sTPJ: 'بیل',
    N2lVS1w4EtoT3dr4eOWO: 'شارلوت',
    '2EiwWnXFnvU5JabPnv8n': 'کلاید',
    D38z5RcWu1voky8WS1ja: 'پل',
    '5Q0t7uMcjvnagumLfvZi': 'هری',
    CYw3kZ02Hs0563khs1Fj: 'دیو',
    JBFqnCBsd6RMkjVDRZzb: 'فین',
    ZQe5CZNOzWyzPSCn5a3c: 'سارا',
    Xb7hH8MSUJpSbSDYk0k2: 'جورج',
    Zlb1dXrM653N07WRdFW3: 'امیلی',
    SoNIKhy3e4vNc82PaR0n: 'لیلی',
    g5CIjZEefAph4nQFvHAz: 'فریا',
    iP95p4xoKVk53GoZ742B: 'کریس',
    jBpfuIE2acCO8z3wKNLl: 'برایان',
    bVMeCyTHy58xNoL34h3p: 'جسی',
    flq6f7yk4E4fJM5XTYuZ: 'مایکل',
    '29vD33N1hTXG9a7a9GgF': 'ماتیلدا',
    IKne3meq5aSn9XLyUdCD: 'چارلی',
  };

  /** لیست پیش‌فرض صداهای ElevenLabs وقتی API دسترسی voices ندارد (id, name, nameFa) */
  private static readonly ELEVENLABS_DEFAULT_VOICES: { id: string; name: string; nameFa: string }[] = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', nameFa: 'راشل' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', nameFa: 'بلا' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', nameFa: 'آنتونی' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', nameFa: 'الی' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', nameFa: 'جاش' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', nameFa: 'آرنولد' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', nameFa: 'آدم' },
    { id: 'ZQe5CZNOzWyzPSCn5a3c', name: 'Sarah', nameFa: 'سارا' },
    { id: 'Zlb1dXrM653N07WRdFW3', name: 'Emily', nameFa: 'امیلی' },
  ];

  estimate(type: 'tts' | 'stt', model?: string): { estimatedCoins: number } {
    const cost = type === 'tts' ? getTtsModelCost(model) : getSttModelCost(model);
    return { estimatedCoins: cost };
  }

  /** گزینه‌های TTS برای فرانت: صداها و مدل‌های ElevenLabs (در صورت وجود کلید) */
  async getTtsOptions(): Promise<{
    voices: { id: string; name: string; nameFa: string }[];
    elevenlabsModels: { id: string; name: string; coinCost: number }[];
  }> {
    const apiKey = await this.aiProviderConfig.getApiKeyForProvider('elevenlabs');
    const defaultResult = {
      voices: [] as { id: string; name: string; nameFa: string }[],
      elevenlabsModels: [] as { id: string; name: string; coinCost: number }[],
    };
    if (!apiKey?.trim()) return defaultResult;

    const headers = { 'xi-api-key': apiKey.trim(), 'Content-Type': 'application/json' };
    const coinCost = getTtsModelCost('elevenlabs/multilingual-v2');

    let elevenlabsModels: { id: string; name: string; coinCost: number }[] = [];
    try {
      const modelsRes = await fetch('https://api.elevenlabs.io/v1/models', { method: 'GET', headers });
      if (modelsRes.ok) {
        const arr = (await modelsRes.json()) as unknown[];
        if (Array.isArray(arr)) {
          elevenlabsModels = arr
            .filter((m: any) => m?.model_id && (m?.can_do_text_to_speech ?? true))
            .map((m: any) => ({
              id: m.model_id,
              name: typeof m.name === 'string' ? m.name : m.model_id,
              coinCost,
            }));
        }
      }
    } catch (e) {
      this.logger.warn(`ElevenLabs getTtsOptions models: ${e instanceof Error ? e.message : String(e)}`);
    }

    let voices: { id: string; name: string; nameFa: string }[] = [];
    try {
      const voicesRes = await fetch('https://api.elevenlabs.io/v1/voices', { method: 'GET', headers });
      if (voicesRes.ok) {
        const data = (await voicesRes.json()) as { voices?: Array<{ voice_id?: string; name?: string }> };
        const list = data?.voices ?? (Array.isArray(data) ? data : []);
        voices = list.map((v: any) => {
          const id = v?.voice_id ?? v?.id ?? '';
          const name = typeof v?.name === 'string' ? v.name : id;
          const nameFa = AudioService.ELEVENLABS_VOICE_NAMES_FA[id] ?? name;
          return { id, name, nameFa };
        });
      }
    } catch (e) {
      this.logger.warn(`ElevenLabs getTtsOptions voices: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (voices.length === 0) voices = [...AudioService.ELEVENLABS_DEFAULT_VOICES];

    return { voices, elevenlabsModels };
  }

  /** تولید افکت صوتی از متن (ElevenLabs Sound Effects). هزینه ثابت ۵ سکه. */
  async createSoundEffect(
    userId: string,
    text: string,
    options?: { durationSeconds?: number; promptInfluence?: number; loop?: boolean },
  ): Promise<{ audioUrl: string; coinCost: number }> {
    const coinCost = 5;
    await this.usersService.deductCoins(userId, coinCost, 'افکت صوتی', 'audio');
    const apiKey = await this.aiProviderConfig.getApiKeyForProvider('elevenlabs');
    if (!apiKey?.trim()) throw new Error('کلید ElevenLabs در پنل مدیریت تنظیم نشده است.');
    const body: Record<string, unknown> = {
      text: text.trim() || 'کلیک نرم',
      model_id: 'eleven_text_to_sound_v2',
    };
    if (options?.durationSeconds != null && options.durationSeconds >= 0.5 && options.durationSeconds <= 30) {
      body.duration_seconds = options.durationSeconds;
    }
    if (options?.promptInfluence != null && options.promptInfluence >= 0 && options.promptInfluence <= 1) {
      body.prompt_influence = options.promptInfluence;
    }
    if (options?.loop === true) body.loop = true;
    const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey.trim(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`ElevenLabs sound-generation: ${res.status} ${err.slice(0, 200)}`);
      if (res.status === 401) throw new Error('API key ElevenLabs نامعتبر است.');
      if (res.status === 429) throw new Error('محدودیت درخواست ElevenLabs.');
      throw new Error(`افکت صوتی: خطای ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64}`;
    await this.prisma.generation.create({
      data: {
        userId,
        service: 'audio',
        input: text,
        output: audioUrl,
        model: 'eleven_text_to_sound_v2',
        coinCost,
        metadata: JSON.stringify({ type: 'sound_effect' }),
      },
    });
    return { audioUrl, coinCost };
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
