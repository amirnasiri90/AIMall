import { Controller, Get, Post, Delete, Query, Param, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AgentsService } from './agents.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtService } from '@nestjs/jwt';
import { extractTextFromPdfBase64 } from '../chat/pdf-extract';

@Controller('agents')
export class AgentsController {
  constructor(
    private agentsService: AgentsService,
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
    private organizationsService: OrganizationsService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  listAgents() {
    return this.agentsService.listAgents();
  }

  // Agent conversation management
  @UseGuards(JwtAuthGuard)
  @Get(':agentId/conversations')
  getConversations(
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId = organizationId === '' || organizationId === 'null' ? null : organizationId;
    return this.conversationsService.findAllByAgent(user.id, agentId, orgId ?? undefined);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':agentId/conversations')
  async createConversation(
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
    @Body('title') title?: string,
    @Body('organizationId') organizationId?: string | null,
  ) {
    const orgId = organizationId || undefined;
    if (orgId) await this.organizationsService.checkOrgAgentsAllowed(orgId, user.id);
    const agent = this.agentsService.getAgent(agentId);
    const prefixMap: Record<string, string> = {
      'student-tutor': '🎓', 'fitness-diet': '💪', 'travel-tourism': '🧳',
      'fashion': '👗', 'home': '🏠', 'finance': '💰', 'lifestyle': '✨', 'instagram-admin': '📷',
      'persian-pdf-maker': '📄',
    };
    const prefix = agent && prefixMap[agentId] ? prefixMap[agentId] : '🎓';
    const defaultTitle = agent ? `${prefix} ${agent.name}` : 'گفتگوی دستیار';
    return this.conversationsService.create(user.id, title || defaultTitle, agentId, orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':agentId/conversations/:convId')
  deleteConversation(
    @Param('convId') convId: string,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.delete(convId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':agentId/conversations/:convId/messages')
  async getMessages(
    @Param('convId') convId: string,
    @CurrentUser() user: any,
  ) {
    await this.conversationsService.findOne(convId, user.id);
    return this.messagesService.findByConversation(convId);
  }

  @Get(':agentId/stream')
  async stream(
    @Param('agentId') agentId: string,
    @Query('conversationId') conversationId: string,
    @Query('message') message: string,
    @Query('level') level: string,
    @Query('style') style: string,
    @Query('mode') mode: string,
    @Query('subject') subject: string,
    @Query('integrityMode') integrityMode: string,
    @Query('place') place: string,
    @Query('timePerDay') timePerDay: string,
    @Query('travelStyle') travelStyle: string,
    @Query('destinationType') destinationType: string,
    @Query('workspaceContext') workspaceContext: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    // Manual JWT validation (SSE can't use Bearer headers easily)
    let user: any;
    try {
      const payload = this.jwtService.verify(token);
      user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      const params = {
        level: (level || 'standard') as any,
        style: style || 'full_solution',
        mode: (mode || 'fast') as any,
        subject: subject || undefined,
        integrityMode: integrityMode === 'true',
        place: place || undefined,
        timePerDay: timePerDay || undefined,
        travelStyle: travelStyle || undefined,
        destinationType: destinationType || undefined,
        workspaceContext: workspaceContext || undefined,
      };

      const stream = this.agentsService.streamAgent(user.id, agentId, conversationId, message, params);
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'خطا در پردازش' })}\n\n`);
    }
    res.end();
  }

  @UseGuards(JwtAuthGuard)
  @Post(':agentId/stream')
  async streamPost(
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
    @Body('conversationId') conversationId: string,
    @Body('message') message: string,
    @Body('level') level: string,
    @Body('style') style: string,
    @Body('mode') mode: string,
    @Body('subject') subject: string,
    @Body('integrityMode') integrityMode: boolean,
    @Body('place') place: string,
    @Body('timePerDay') timePerDay: string,
    @Body('travelStyle') travelStyle: string,
    @Body('destinationType') destinationType: string,
    @Body('workspaceContext') workspaceContext: string,
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

    try {
      const params = {
        level: (level || 'standard') as any,
        style: style || 'full_solution',
        mode: (mode || 'fast') as any,
        subject: subject || undefined,
        integrityMode: integrityMode === true,
        place: place || undefined,
        timePerDay: timePerDay || undefined,
        travelStyle: travelStyle || undefined,
        destinationType: destinationType || undefined,
        workspaceContext: workspaceContext || undefined,
      };
      const imageOnly = imageAttachments.length > 0 ? imageAttachments : undefined;
      const stream = this.agentsService.streamAgent(user.id, agentId, conversationId, msg, params, imageOnly);
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'خطا در پردازش' })}\n\n`);
    }
    res.end();
  }
}
