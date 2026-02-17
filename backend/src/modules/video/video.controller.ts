import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VideoService } from './video.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('video')
@UseGuards(ApiKeyAuthGuard, ScopeGuard)
@RequireScope('video')
@Controller('video')
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Get('models')
  listModels() {
    return this.videoService.listModels();
  }

  @Post('estimate')
  estimate(@Body() body: { model?: string; durationSeconds?: number }) {
    return this.videoService.estimate(body?.model, body?.durationSeconds);
  }

  @Post('generate')
  async generate(
    @CurrentUser() user: any,
    @Body() body: { prompt: string; model?: string; duration?: number; aspectRatio?: string },
  ) {
    return this.videoService.generate(user.id, body.prompt || '', body.model, {
      duration: body.duration,
      aspectRatio: body.aspectRatio,
    });
  }
}
