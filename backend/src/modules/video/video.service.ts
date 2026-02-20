import { Injectable, Logger } from '@nestjs/common';
import { ProviderResolverService } from '../ai-providers/provider-resolver.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { getModelCost } from '../providers/ai-provider.interface';

const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1';
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private resolver: ProviderResolverService,
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  async listModels() {
    return this.resolver.listModelsForSection('video');
  }

  estimate(model?: string, durationSeconds?: number): { estimatedCoins: number } {
    const perSecond = model != null ? (getModelCost(model) || 10) : 10;
    const duration = Math.min(Math.max(durationSeconds ?? 5, 1), 30);
    return { estimatedCoins: perSecond * duration };
  }

  async generate(
    userId: string,
    prompt: string,
    model?: string,
    options?: { duration?: number; aspectRatio?: string },
  ): Promise<{ videoUrl?: string; message: string; jobId?: string }> {
    const durationSeconds = Math.min(Math.max(options?.duration ?? 5, 1), 30);
    const estimated = this.estimate(model, durationSeconds);
    const totalCost = estimated.estimatedCoins;

    const user = await this.usersService.findById(userId);
    if (!user || user.coins < totalCost) {
      return { message: `اعتبار کافی نیست. حداقل ${totalCost} سکه نیاز است.` };
    }

    const resolved = await this.resolver.resolve('video', model);
    if (!resolved?.apiKey) {
      return {
        message:
          'برای تولید ویدیو در پنل مدیریت سرویس ویدیو (مثل Luma) را با API Key فعال کنید.',
      };
    }

    if (resolved.providerKey === 'luma') {
      try {
        await this.usersService.deductCoins(userId, totalCost, 'تولید ویدئو', 'video');
        const videoUrl = await this.callLumaAndPoll(
          resolved.apiKey,
          prompt.trim(),
          options?.aspectRatio,
          durationSeconds,
        );
        if (videoUrl) {
          await this.prisma.generation.create({
            data: {
              userId,
              service: 'video',
              input: prompt,
              output: videoUrl,
              model: resolved.modelId,
              coinCost: totalCost,
              metadata: JSON.stringify({
                provider: 'luma',
                durationSeconds,
                aspectRatio: options?.aspectRatio,
              }),
            },
          });
          return { videoUrl, message: 'ویدیو تولید شد.' };
        }
        return { message: 'تولید ویدیو انجام نشد. بعداً تلاش کنید.' };
      } catch (err: any) {
        this.logger.warn(`Luma video failed: ${err?.message || err}`);
        return {
          message: err?.message || 'خطا در تولید ویدیو. در صورت کسر سکه با پشتیبانی تماس بگیرید.',
        };
      }
    }

    return {
      message: `ارائه‌دهنده «${resolved.providerKey}» هنوز پشتیبانی نمی‌شود. از مدل Luma استفاده کنید.`,
    };
  }

  private async callLumaAndPoll(
    apiKey: string,
    prompt: string,
    aspectRatio?: string,
    durationSeconds?: number,
  ): Promise<string | null> {
    const aspect = this.mapAspectRatio(aspectRatio);
    const duration = durationSeconds && durationSeconds >= 9 ? '9s' : '5s';
    const res = await fetch(`${LUMA_BASE}/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: 'ray-2',
        aspect_ratio: aspect,
        duration,
        generation_type: 'video',
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Luma API ${res.status}`);
    }
    const data = (await res.json()) as { id?: string };
    const id = data?.id;
    if (!id) throw new Error('Luma did not return generation id');

    const deadline = Date.now() + POLL_MAX_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const getRes = await fetch(`${LUMA_BASE}/generations/${id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!getRes.ok) throw new Error(`Luma get generation ${getRes.status}`);
      const gen = (await getRes.json()) as { state?: string; assets?: { video?: string } };
      if (gen.state === 'completed' && gen.assets?.video) return gen.assets.video;
      if (gen.state === 'failed') throw new Error('تولید ویدیو در Luma ناموفق بود.');
    }
    throw new Error('زمان تولید ویدیو تمام شد.');
  }

  private mapAspectRatio(ratio?: string): string {
    const r = (ratio || '16:9').replace(/\s/g, '');
    if (['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21'].includes(r)) return r;
    return '16:9';
  }
}
