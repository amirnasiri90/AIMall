import { Controller, Post, Get, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { TextService } from './text.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GenerateTextDto } from './dto/generate-text.dto';
import { TextActionDto } from './dto/text-action.dto';

@ApiTags('text')
@UseGuards(ApiKeyAuthGuard, ScopeGuard)
@RequireScope('text')
@Controller('text')
export class TextController {
  constructor(private textService: TextService) {}

  @Get('templates')
  getTemplates() {
    return this.textService.getTemplates();
  }

  @Post('estimate')
  estimate(@Body() body: { model?: string }) {
    return this.textService.estimate(body.model);
  }

  @Post('generate')
  generate(@CurrentUser() user: any, @Body() body: GenerateTextDto & { organizationId?: string | null }) {
    return this.textService.generate(
      user.id,
      body.prompt,
      body.tone,
      body.length,
      body.model,
      body.templateId,
      body.variants,
      body.maxTokens,
      body.language,
      body.audience,
      body.styleGuide,
      body.organizationId,
    );
  }

  @Post('stream')
  async stream(
    @CurrentUser() user: any,
    @Body() body: GenerateTextDto & { organizationId?: string | null },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      const stream = this.textService.streamGenerate(
        user.id,
        body.prompt,
        body.tone,
        body.length,
        body.model,
        body.maxTokens,
        body.language,
        body.audience,
        body.styleGuide,
        body.organizationId,
      );
      for await (const event of stream) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: error?.message || 'خطا' })}\n\n`);
    }
    res.end();
  }

  @Post('action')
  action(@CurrentUser() user: any, @Body() body: TextActionDto & { organizationId?: string | null }) {
    return this.textService.action(user.id, body.action, body.text, body.tone, body.model, body.organizationId);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tag') tag?: string,
  ) {
    return this.textService.getHistory(user.id, search, from, to, tag);
  }
}
