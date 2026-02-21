import { Controller, Post, Get, Body, Query, UseGuards, BadRequestException, HttpException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ImageService } from './image.service';
import { JobsService } from '../jobs/jobs.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GenerateImageDto } from './dto/generate-image.dto';

@ApiTags('images')
@UseGuards(ApiKeyAuthGuard, ScopeGuard)
@RequireScope('image')
@Controller('images')
export class ImageController {
  constructor(
    private imageService: ImageService,
    private jobsService: JobsService,
  ) {}

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
