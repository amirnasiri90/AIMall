import { Controller, Post, Get, Body, Query, UseGuards, BadRequestException, HttpException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Res } from '@nestjs/common';
import { Response } from 'express';
import { ImageService } from './image.service';
import { JobsService } from '../jobs/jobs.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GenerateImageDto } from './dto/generate-image.dto';

/** دامنه‌های مجاز برای پروکسی تصویر (جلوگیری از SSRF) */
const PROXY_ALLOWED_HOSTS = [
  'openrouter.ai',
  'cdn.openrouter.ai',
  '.blob.core.windows.net',
  '.azure.com',
  'pollinations.ai',
  'pbxt.replicate.delivery',
  'replicate.delivery',
  'storage.googleapis.com',
  '.amazonaws.com',
  'hmb.art',
];

function isProxyUrlAllowed(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return PROXY_ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(allowed));
  } catch {
    return false;
  }
}

@ApiTags('images')
@UseGuards(ApiKeyAuthGuard, ScopeGuard)
@RequireScope('image')
@Controller('images')
export class ImageController {
  constructor(
    private imageService: ImageService,
    private jobsService: JobsService,
  ) {}

  @Get('proxy')
  @Public()
  async proxyImage(@Query('url') urlEncoded: string, @Res() res: Response) {
    if (!urlEncoded?.trim()) throw new BadRequestException('آدرس تصویر ارسال نشده.');
    let url: string;
    try {
      url = decodeURIComponent(urlEncoded.trim());
    } catch {
      throw new BadRequestException('آدرس تصویر نامعتبر است.');
    }
    if (!isProxyUrlAllowed(url)) throw new BadRequestException('این آدرس برای پروکسی مجاز نیست.');
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!response.ok) {
      throw new BadRequestException(`بارگذاری تصویر ناموفق: ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  }

  @Get('templates')
  getTemplates() {
    return this.imageService.getTemplates();
  }

  @Get('ratios')
  getRatios() {
    return this.imageService.getRatios();
  }

  @Post('estimate')
  estimate(@Body() body: { model?: string; count?: number }) {
    return this.imageService.estimate(body?.model, body?.count);
  }

  @Post('edit')
  async editImage(
    @CurrentUser() user: any,
    @Body() body: { image: string; prompt: string; editType?: string; ratio?: string; model?: string },
  ) {
    if (!body?.image?.trim()) throw new BadRequestException('تصویر ارسال نشده.');
    try {
      return await this.imageService.editImage(
        user.id,
        body.image.trim(),
        body.prompt?.trim() ?? '',
        body.editType,
        body.ratio,
        body.model,
      );
    } catch (e) {
      if (e instanceof HttpException) throw e;
      const message = e instanceof Error ? e.message : 'خطا در ویرایش تصویر';
      throw new BadRequestException(message);
    }
  }

  @Post('generate')
  async generate(@CurrentUser() user: any, @Body() body: GenerateImageDto & { organizationId?: string | null }) {
    try {
      return await this.imageService.generate(
        user.id,
        body.prompt,
        body.style,
        body.size,
        body.model || undefined,
        body.templateId,
        body.ratio,
        body.sizeTier,
        body.count,
        body.styleGuide,
        body.negativePrompt,
        body.tag,
        body.organizationId,
      );
    } catch (e) {
      if (e instanceof HttpException) throw e;
      const message = e instanceof Error ? e.message : 'خطا در تولید تصویر';
      throw new BadRequestException(message);
    }
  }

  @Post('generate/async')
  generateAsync(@CurrentUser() user: any, @Body() body: GenerateImageDto) {
    const job = this.jobsService.create(user.id, 'image', {
      prompt: body.prompt,
      style: body.style,
      size: body.size,
      model: body.model,
      ratio: body.ratio,
      sizeTier: body.sizeTier,
      count: body.count,
    });
    return job;
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('model') model?: string,
    @Query('style') style?: string,
    @Query('tag') tag?: string,
  ) {
    return this.imageService.getHistory(user.id, search, from, to, model, style, tag);
  }
}
