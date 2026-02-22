import { Injectable, Logger, BadRequestException, HttpException } from '@nestjs/common';
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
  'gpt-4o-mini': 6,
  'gpt-4.1-mini': 6,
  'gpt-4.1': 10,
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

  /** پیشنهادهای ویرایش: به پرامپت کاربر اضافه می‌شود */
  private static readonly EDIT_PRESETS: Record<string, string> = {
    general: '',
    remove_bg: 'Remove the background from this image, keep only the main subject. Output only the edited image. ',
    separate_subject: 'Isolate and separate the main subject from the background with clean edges. ',
    make_3d: 'Convert this image to a 3D rendered style with depth and volumetric lighting. ',
    enhance: 'Enhance and improve this image quality, sharpness and colors. ',
    style_transfer: 'Apply a new artistic style to this image while keeping the composition. ',
  };

  /** نگاشت مدل ویرایش به شناسه OpenRouter */
  private static readonly EDIT_MODEL_MAP: Record<string, string> = {
    flux: 'black-forest-labs/flux.2-pro',
    'flux-pro': 'black-forest-labs/flux.2-pro',
    'flux-realism': 'black-forest-labs/flux.2-pro',
    'flux-flex': 'black-forest-labs/flux.2-flex',
    'flux-max': 'black-forest-labs/flux.2-max',
    turbo: 'black-forest-labs/flux.2-klein-4b',
    'flux-anime': 'black-forest-labs/flux.2-pro',
    'flux-3d': 'black-forest-labs/flux.2-pro',
    'flux-pixel': 'black-forest-labs/flux.2-pro',
  };

  /** ویرایش تصویر با OpenRouter Flux (image + prompt → image). هزینه ۶ سکه. */
  async editImage(
    userId: string,
    imageDataUrl: string,
    prompt: string,
    editType?: string,
    ratio?: string,
    editModel?: string,
  ): Promise<{ imageUrl: string; coinCost: number }> {
    const coinCost = 6;
    const user = await this.usersService.findById(userId);
    if (!user || user.coins < coinCost) {
      throw new BadRequestException(`اعتبار کافی نیست. حداقل ${coinCost} سکه نیاز است.`);
    }
    const effectiveEditModel = editModel?.trim() || 'flux';
    const resolved = await this.resolver.resolve('image', effectiveEditModel);
    if (!resolved?.providerKey || resolved.providerKey !== 'openrouter' || !resolved.apiKey) {
      throw new BadRequestException(
        'ویرایش تصویر با مدل Flux از طریق OpenRouter انجام می‌شود. در پنل مدیریت → ارائه‌دهندگان، کلید API مربوط به OpenRouter را تنظیم کنید.',
      );
    }
    const openRouterModel =
      resolved.modelId?.includes('/') ?
        resolved.modelId
      : ImageService.EDIT_MODEL_MAP[resolved.modelId] ?? 'black-forest-labs/flux.2-pro';
    const preset = editType && ImageService.EDIT_PRESETS[editType] ? ImageService.EDIT_PRESETS[editType] : '';
    const fullPrompt = (preset + (prompt || 'Edit this image as requested.')).trim();
    const aspectRatio = ratio && ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '5:4', '4:5', '21:9'].includes(ratio) ? ratio : '1:1';

    let res: Response;
    try {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolved.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.BACKEND_URL || 'https://aimall.local',
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: fullPrompt },
                { type: 'image_url', image_url: { url: imageDataUrl } },
              ],
            },
          ],
          modalities: ['image'],
          image_config: { aspect_ratio: aspectRatio },
        }),
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`OpenRouter edit image request failed: ${errMsg}`);
      throw new BadRequestException(`خطا در ارتباط با سرویس ویرایش تصویر: ${errMsg}`);
    }

    const rawBody = await res.text();
    if (!res.ok) {
      this.logger.warn(`OpenRouter edit image: ${res.status} ${rawBody.slice(0, 300)}`);
      throw new BadRequestException(rawBody || `سرویس ویرایش تصویر خطا برگرداند (${res.status})`);
    }

    let data: { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string }; url?: string }> }; content?: any[] }> };
    try {
      data = JSON.parse(rawBody) as typeof data;
    } catch {
      this.logger.warn(`OpenRouter edit image: invalid JSON response`);
      throw new BadRequestException('پاسخ سرویس ویرایش تصویر نامعتبر است.');
    }

    const msg = data?.choices?.[0]?.message;
    const images = msg?.images ?? (msg as any)?.content?.filter((c: any) => c?.type === 'image_url') ?? [];
    const url = images[0]?.image_url?.url ?? images[0]?.url;
    if (!url) {
      throw new BadRequestException('OpenRouter هیچ تصویری برنگرداند.');
    }
    await this.usersService.deductCoins(userId, coinCost, 'ویرایش تصویر', 'image');
    const modelLabel = resolved.modelId || 'flux.2-pro-edit';
    await this.prisma.generation.create({
      data: {
        userId,
        service: 'image',
        input: prompt || 'edit',
        output: url,
        model: modelLabel,
        coinCost,
        metadata: JSON.stringify({ type: 'image_edit', editType: editType || 'general', ratio, editModel: effectiveEditModel }),
      },
    });
    return { imageUrl: url, coinCost };
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
    try {
    if (organizationId) await this.organizationsService.checkOrgImageLimit(organizationId, userId);
    const perCost = getImageModelCost(imageModel);
    const n = Math.min(Math.max(count ?? 1, 1), 4);
    const totalCost = perCost * n;

    const user = await this.usersService.findById(userId);
    if (!user || user.coins < totalCost) {
      throw new BadRequestException(`اعتبار کافی نیست. حداقل ${totalCost} سکه نیاز است.`);
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
    // مدل‌های واقعی OpenRouter: flux.2-pro, flux.2-flex, flux.2-max, flux.2-klein-4b
    if (resolved?.providerKey === 'openrouter' && resolved.apiKey) {
      const openRouterModelIdMap: Record<string, string> = {
        flux: 'black-forest-labs/flux.2-pro',
        'flux-pro': 'black-forest-labs/flux.2-pro',
        'flux-realism': 'black-forest-labs/flux.2-pro',
        'flux-flex': 'black-forest-labs/flux.2-flex',
        'flux-max': 'black-forest-labs/flux.2-max',
        turbo: 'black-forest-labs/flux.2-klein-4b',
        'flux-anime': 'black-forest-labs/flux.2-pro',
        'flux-3d': 'black-forest-labs/flux.2-pro',
        'flux-pixel': 'black-forest-labs/flux.2-pro',
      };
      const openRouterModel = resolved.modelId.includes('/')
        ? resolved.modelId
        : openRouterModelIdMap[resolved.modelId] ?? `black-forest-labs/${resolved.modelId}`;
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
          throw new BadRequestException(err || `OpenRouter ${res.status}`);
        }
        const data = await res.json();
        const msg = data?.choices?.[0]?.message;
        const images = msg?.images || msg?.content?.filter((c: any) => c?.type === 'image_url') || [];
        const urls: string[] = [];
        for (const img of images) {
          const url = img?.image_url?.url ?? img?.url;
          if (url) urls.push(url);
        }
        if (urls.length === 0) throw new BadRequestException('OpenRouter هیچ تصویری برنگرداند');
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

    const openaiImageModels = ['dall-e-3', 'dall-e-2', 'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1'];
    if (resolved?.providerKey === 'openai' && resolved.apiKey && openaiImageModels.includes(resolved.modelId)) {
      try {
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new BadRequestException(msg || 'خطا در تولید تصویر با OpenAI');
      }
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
    } catch (e) {
      if (e instanceof HttpException) throw e;
      this.logger.warn(`Image generate error: ${e instanceof Error ? e.message : e}`);
      throw new BadRequestException(e instanceof Error ? e.message : 'خطا در تولید تصویر');
    }
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
