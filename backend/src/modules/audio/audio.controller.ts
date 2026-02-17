import { Controller, Post, Get, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, HttpException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AudioService } from './audio.service';
import { JobsService } from '../jobs/jobs.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TextToSpeechDto } from './dto/text-to-speech.dto';

@ApiTags('audio')
@UseGuards(ApiKeyAuthGuard, ScopeGuard)
@RequireScope('audio')
@Controller('audio')
export class AudioController {
  constructor(
    private audioService: AudioService,
    private jobsService: JobsService,
  ) {}

  @Post('estimate')
  estimate(@Body() body: { type: 'tts' | 'stt'; model?: string }) {
    return this.audioService.estimate(body.type, body.model);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    return this.audioService.getHistory(user.id, { search, from, to, type });
  }

  @Post('tts')
  async textToSpeech(
    @CurrentUser() user: any,
    @Body() body: TextToSpeechDto,
  ) {
    try {
      return await this.audioService.textToSpeech(user.id, body.text, body.voice, body.model, {
        speed: body.speed,
        language: body.language,
      });
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      const msg = err?.message ?? String(err);
      throw new BadRequestException(msg);
    }
  }

  @Post('tts/async')
  textToSpeechAsync(
    @CurrentUser() user: any,
    @Body() body: TextToSpeechDto,
  ) {
    return this.jobsService.create(user.id, 'audio_tts', {
      text: body.text,
      voice: body.voice,
      model: body.model,
      speed: body.speed,
      language: body.language,
    });
  }

  @Post('stt')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  speechToText(
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
    @Body('model') model?: string,
  ) {
    return this.audioService.speechToText(
      user.id,
      file?.originalname,
      file?.size,
      model,
      file?.buffer,
      file?.mimetype,
    );
  }

  @Post('stt/async')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async speechToTextAsync(
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
    @Body('model') model?: string,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('فایل صوتی ارسال نشده');
    const fileBase64 = file.buffer.toString('base64');
    return this.jobsService.create(user.id, 'audio_stt', {
      fileBase64,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
      model,
    });
  }
}
