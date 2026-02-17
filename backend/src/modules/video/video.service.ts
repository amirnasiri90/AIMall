import { Injectable } from '@nestjs/common';
import { ProviderResolverService } from '../ai-providers/provider-resolver.service';

const VIDEO_MODEL_COSTS: Record<string, number> = {
  veo: 15,
  luma: 12,
  nanobenana: 10,
};

@Injectable()
export class VideoService {
  constructor(private resolver: ProviderResolverService) {}

  async listModels() {
    return this.resolver.listModelsForSection('video');
  }

  estimate(model?: string, durationSeconds?: number): { estimatedCoins: number } {
    const perSecond = model && VIDEO_MODEL_COSTS[model] != null ? VIDEO_MODEL_COSTS[model] : 10;
    const duration = Math.min(Math.max(durationSeconds ?? 5, 1), 30);
    return { estimatedCoins: perSecond * duration };
  }

  /** Stub: ویدیو از طریق نقشه سرویس و APIهای Veo/Luma/NanoBenana در نسخه‌های بعد فعال می‌شود. */
  async generate(
    _userId: string,
    _prompt: string,
    _model?: string,
    _options?: { duration?: number; aspectRatio?: string },
  ): Promise<{ videoUrl?: string; message: string; jobId?: string }> {
    const resolved = await this.resolver.resolve('video', _model);
    if (!resolved?.apiKey) {
      return { message: 'برای تولید ویدیو ابتدا در پنل مدیریت سرویس ویدیو (مثل Veo یا Luma) را با API Key فعال کنید.' };
    }
    return { message: 'تولید ویدیو به زودی از طریق همین ارائه‌دهندگان فعال می‌شود.' };
  }
}
