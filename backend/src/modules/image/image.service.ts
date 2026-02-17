import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { ProviderResolverService } from '../ai-providers/provider-resolver.service';
import { OpenAIImagesService } from './openai-images.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { IMAGE_TEMPLATES } from './image-templates';
import { RATIO_OPTIONS, getDimensions } from './image-ratios';

/** سکه مصرفی هر مدل تصویر */
export const IMAGE_MODEL_COSTS: Record<string, number> = {
  flux: 5,
  'flux-realism': 5,
  'flux-anime': 5,
  'flux-3d': 5,
  'flux-pixel': 5,
  turbo: 3,
  'dall-e-3': 8,
  'dall-e-2': 4,
};

export function getImageModelCost(model?: string): number {
  const cost = model ? IMAGE_MODEL_COSTS[model] : undefined;
  return typeof cost === 'number' ? cost : IMAGE_MODEL_COSTS.flux ?? 5;
}

const STYLE_MAP: Record<string, string> = {
  realistic: 'photorealistic, high quality',
  cartoon: 'cartoon style, colorful, fun',
  'oil-painting': 'oil painting style, textured, classical art',
  minimal: 'minimalist style, clean, simple shapes, flat design',
  photography: 'professional photography, sharp focus, natural lighting',
  fantasy: 'fantasy art, magical, detailed',
  cyberpunk: 'cyberpunk style, neon, futuristic',
  watercolor: 'watercolor painting, soft edges, artistic',
  'line-art': 'line art, black and white, clean lines',
  pixel: 'pixel art, 8-bit style, retro game',
};

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private providerManager: ProviderManagerService,
    private resolver: ProviderResolverService,
    private openAIImages: OpenAIImagesService,
    private organizationsService: OrganizationsService,
  ) {}

  getTemplates() {
    return IMAGE_TEMPLATES;
  }

  getRatios() {
    return RATIO_OPTIONS;
  }

  estimate(imageModel?: string, count?: number): { estimatedCoins: number } {
    const perImage = getImageModelCost(imageModel);
    const n = Math.min(Math.max(count ?? 1, 1), 4);
    return { estimatedCoins: perImage * n };
  }

  async generate(
    userId: string,
    prompt: string,
    style?: string,
    size?: string,
    imageModel?: string,
    templateId?: string,
    ratio?: string,
    sizeTier?: string,
    count?: number,
    styleGuide?: string,
    negativePrompt?: string,
    tag?: string,
    organizationId?: string | null,
  ) {
    if (organizationId) await this.organizationsService.checkOrgImageLimit(organizationId, userId);
    const perCost = getImageModelCost(imageModel);
    const n = Math.min(Math.max(count ?? 1, 1), 4);
    const totalCost = perCost * n;

    const user = await this.usersService.findById(userId);
    if (!user || user.coins < totalCost) {
      throw new Error(`اعتبار کافی نیست. حداقل ${totalCost} سکه نیاز است.`);
    }

    const { w, h } = getDimensions(ratio, sizeTier, size);

    const template = templateId ? IMAGE_TEMPLATES.find((t) => t.id === templateId) : null;
    let fullPrompt = prompt;
    if (template?.promptSuffix) fullPrompt = `${prompt}, ${template.promptSuffix}`;
    if (styleGuide) fullPrompt = `${fullPrompt}. Style guide: ${styleGuide}`;
    if (style && style !== 'realistic') {
      fullPrompt = `${fullPrompt}, ${STYLE_MAP[style] || style}`;
    }

    let enhancedPrompt = fullPrompt;
    try {
      const result = await this.providerManager.generateTextWithFallback(
        `You are an expert image prompt engineer. Convert this user request into an optimal English image generation prompt. Keep it under 200 characters. Only output the prompt text, nothing else.\n\nUser request: ${fullPrompt}`,
        'openai/gpt-4o-mini',
        { maxTokens: 100 },
      );
      if (result.text && result.text.length > 5) {
        enhancedPrompt = result.text.trim().replace(/^["']|["']$/g, '');
      }
    } catch (e) {
      this.logger.warn(`Prompt enhancement failed, using original: ${e}`);
    }
    if (negativePrompt?.trim()) {
      enhancedPrompt = `${enhancedPrompt}. Avoid: ${negativePrompt.trim()}`;
    }

    const effectiveModel = imageModel || 'flux';
    const resolved = await this.resolver.resolve('image', effectiveModel);
    const imageUrls: string[] = [];

    // OpenRouter: تصویر از طریق chat/completions با modalities: ['image']
    if (resolved?.providerKey === 'openrouter' && resolved.apiKey) {
      const openRouterModel = resolved.modelId.includes('/')
        ? resolved.modelId
        : resolved.modelId === 'flux' || resolved.modelId === 'flux-pro'
          ? 'black-forest-labs/flux.2-pro'
          : resolved.modelId === 'flux-flex'
            ? 'black-forest-labs/flux.2-flex'
            : `black-forest-labs/${resolved.modelId}`;
      const aspectRatio = ratio && ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '5:4', '4:5', '21:9'].includes(ratio) ? ratio : '1:1';
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resolved.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.BACKEND_URL || 'https://aimall.local',
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: [{ role: 'user', content: enhancedPrompt }],
            modalities: ['image'],
            image_config: { aspect_ratio: aspectRatio },
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || `OpenRouter ${res.status}`);
        }
        const data = await res.json();
        const msg = data?.choices?.[0]?.message;
        const images = msg?.images || msg?.content?.filter((c: any) => c?.type === 'image_url') || [];
        const urls: string[] = [];
        for (const img of images) {
          const url = img?.image_url?.url ?? img?.url;
          if (url) urls.push(url);
        }
        if (urls.length === 0) throw new Error('OpenRouter هیچ تصویری برنگرداند');
        for (let i = 0; i < Math.min(urls.length, n); i++) {
          await this.usersService.deductCoins(userId, perCost, 'تولید تصویر', 'image');
          await this.prisma.generation.create({
            data: {
              userId,
              organizationId: organizationId || undefined,
              service: 'image',
              input: prompt,
              output: urls[i],
              model: resolved.modelId,
              coinCost: perCost,
              metadata: JSON.stringify({
                style,
                size,
                ratio,
                sizeTier,
                enhancedPrompt,
                imageModel: resolved.modelId,
                tag: tag || undefined,
                dimensions: { w, h },
                provider: 'openrouter',
              }),
            },
          });
          imageUrls.push(urls[i]);
        }
        return {
          imageUrl: imageUrls.length === 1 ? imageUrls[0] : undefined,
          imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
          model: resolved.modelId,
          coinCost: totalCost,
          enhancedPrompt,
          dimensions: { w, h },
        };
      } catch (e) {
        this.logger.warn(`OpenRouter image failed: ${e}`);
        // fallback to pollinations below with effectiveModel
      }
    }

    if (resolved?.providerKey === 'openai' && resolved.apiKey && (resolved.modelId === 'dall-e-3' || resolved.modelId === 'dall-e-2')) {
      const urls = await this.openAIImages.generate(resolved.apiKey, enhancedPrompt, { w, h, model: resolved.modelId, n });
      for (let i = 0; i < urls.length; i++) {
        await this.usersService.deductCoins(userId, perCost, 'تولید تصویر', 'image');
        await this.prisma.generation.create({
          data: {
            userId,
            organizationId: organizationId || undefined,
            service: 'image',
            input: prompt,
            output: urls[i],
            model: resolved.modelId,
            coinCost: perCost,
            metadata: JSON.stringify({
              style,
              size,
              ratio,
              sizeTier,
              enhancedPrompt,
              imageModel: resolved.modelId,
              tag: tag || undefined,
              dimensions: { w, h },
            }),
          },
        });
        imageUrls.push(urls[i]);
      }
      return {
        imageUrl: imageUrls.length === 1 ? imageUrls[0] : undefined,
        imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
        model: resolved.modelId,
        coinCost: totalCost,
        enhancedPrompt,
        dimensions: { w, h },
      };
    }

    for (let i = 0; i < n; i++) {
      const seed = Math.floor(Math.random() * 1000000);
      const encoded = encodeURIComponent(enhancedPrompt);
      const url = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&seed=${seed}&model=${effectiveModel}&nologo=true`;
      imageUrls.push(url);

      await this.usersService.deductCoins(userId, perCost, 'تولید تصویر', 'image');
      await this.prisma.generation.create({
        data: {
          userId,
          organizationId: organizationId || undefined,
          service: 'image',
          input: prompt,
          output: url,
          model: effectiveModel,
          coinCost: perCost,
          metadata: JSON.stringify({
            style,
            size,
            ratio,
            sizeTier,
            enhancedPrompt,
            imageModel: effectiveModel,
            tag: tag || undefined,
            dimensions: { w, h },
          }),
        },
      });
    }

    return {
      imageUrl: n === 1 ? imageUrls[0] : undefined,
      imageUrls: n > 1 ? imageUrls : undefined,
      model: effectiveModel,
      coinCost: totalCost,
      enhancedPrompt,
      dimensions: { w, h },
    };
  }

  async getHistory(
    userId: string,
    search?: string,
    from?: string,
    to?: string,
    model?: string,
    style?: string,
    tag?: string,
  ) {
    const where: any = { userId, service: 'image' };

    if (search?.trim()) {
      where.OR = [
        { input: { contains: search } },
        { output: { contains: search } },
        { metadata: { contains: search } },
      ];
    }
    if (model?.trim()) where.model = model;
    if (style?.trim() || tag?.trim()) {
      const andMeta: any[] = [];
      if (style?.trim()) andMeta.push({ metadata: { contains: style } });
      if (tag?.trim()) andMeta.push({ metadata: { contains: tag } });
      if (andMeta.length) where.AND = [...(where.AND || []), ...andMeta];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    return this.prisma.generation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
