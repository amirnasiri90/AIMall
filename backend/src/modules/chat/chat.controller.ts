import { Controller, Get, Post, Query, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { extractTextFromPdfBase64 } from './pdf-extract';

@ApiTags('chat')
@UseGuards(ApiKeyAuthGuard, ScopeGuard)
@RequireScope('chat')
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private providerManager: ProviderManagerService,
  ) {}

  @Get('stream')
  async stream(
    @Query('conversationId') conversationId: string,
    @Query('message') message: string,
    @Query('model') model: string,
    @Query('mode') mode: string,
    @Query('regenerate') regenerate: string,
    @Query('regenerateStyle') regenerateStyle: string,
    @Query('quickAction') quickAction: string,
    @Query('referenceMessageId') referenceMessageId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      const isRegenerate = regenerate === 'true';
      const modelOrMode = model || mode;
      const stream = this.chatService.chat(user.id, conversationId, message || '', modelOrMode, isRegenerate, regenerateStyle || undefined, quickAction || undefined, referenceMessageId || undefined);
      for await (const event of stream) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'خطا در پردازش' })}\n\n`);
    }
    res.end();
  }

  @Post('stream')
  async streamPost(
    @CurrentUser() user: any,
    @Body('conversationId') conversationId: string,
    @Body('message') message: string,
    @Body('model') model: string,
    @Body('mode') mode: string,
    @Body('regenerate') regenerate: boolean,
    @Body('regenerateStyle') regenerateStyle: string,
    @Body('quickAction') quickAction: string,
    @Body('referenceMessageId') referenceMessageId: string,
    @Body('attachments') attachments: { type: string; data: string; name?: string }[] | undefined,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let msg = message || '';
    const imageAttachments = attachments?.filter((a) => a.type === 'image') ?? [];
    const pdfAttachments = attachments?.filter((a) => a.type === 'pdf') ?? [];
    for (const pdf of pdfAttachments) {
      try {
        const pdfText = await extractTextFromPdfBase64(pdf.data);
        if (pdfText) {
          msg += `\n\n[محتوای استخراج‌شده از فایل PDF (${pdf.name || 'پیوست'}):]\n${pdfText}`;
        } else {
          msg += '\n\n[فایل PDF پیوست شده — متن قابل استخراج نبود.]';
        }
      } catch {
        msg += '\n\n[فایل PDF پیوست شده — خطا در خواندن محتوا.]';
      }
    }
    const allAttachments = imageAttachments.length > 0 ? attachments : undefined;

    try {
      const isRegenerate = regenerate === true;
      const modelOrMode = model || mode;
      const stream = this.chatService.chat(
        user.id,
        conversationId,
        msg,
        modelOrMode,
        isRegenerate,
        regenerateStyle || undefined,
        quickAction || undefined,
        referenceMessageId || undefined,
        allAttachments,
      );
      for await (const event of stream) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'خطا در پردازش' })}\n\n`);
    }
    res.end();
  }

  @Post('estimate')
  async estimate(
    @CurrentUser() user: any,
    @Body('message') message: string,
    @Body('mode') mode: string,
    @Body('model') model: string,
    @Body('conversationId') conversationId: string,
  ) {
    const modeOrModel = model || mode;
    return this.chatService.estimate(user.id, message || '', modeOrModel, conversationId);
  }

  @Get('models')
  getModels(@Query('service') service?: string) {
    return this.providerManager.listModels(service);
  }

  @Get('modes')
  getModes() {
    return {
      fast: { id: 'fast', label: 'سریع', modelId: 'openai/gpt-3.5-turbo' },
      economy: { id: 'economy', label: 'اقتصادی', modelId: 'openai/gpt-4o-mini' },
      accurate: { id: 'accurate', label: 'دقیق', modelId: 'anthropic/claude-3.5-sonnet' },
    };
  }
}
