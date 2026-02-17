import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessagesService } from '../messages/messages.service';
import { MemoryService } from '../memory/memory.service';

@ApiTags('conversations')
@UseGuards(ApiKeyAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
    private memoryService: MemoryService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body('title') title?: string,
    @Body('agentId') agentId?: string,
    @Body('organizationId') organizationId?: string | null,
  ) {
    return this.conversationsService.create(user.id, title, agentId, organizationId ?? undefined);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('pinned') pinned?: string,
    @Query('archived') archived?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId = organizationId === '' || organizationId === 'null' ? null : organizationId;
    return this.conversationsService.findAll(user.id, {
      search: search || undefined,
      pinned: pinned === 'true' ? true : pinned === 'false' ? false : undefined,
      archived: archived === 'true',
      organizationId: orgId ?? undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.conversationsService.findOne(id, user.id);
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string, @CurrentUser() user: any) {
    await this.conversationsService.findOne(id, user.id);
    return this.messagesService.findByConversation(id);
  }

  @Patch(':id/title')
  updateTitle(@Param('id') id: string, @CurrentUser() user: any, @Body('title') title: string) {
    return this.conversationsService.updateTitle(id, user.id, title);
  }

  @Patch(':id/pin')
  togglePin(@Param('id') id: string, @CurrentUser() user: any) {
    return this.conversationsService.togglePin(id, user.id);
  }

  @Patch(':id/archive')
  toggleArchive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.conversationsService.toggleArchive(id, user.id);
  }

  @Patch(':id/system-prompt')
  updateSystemPrompt(@Param('id') id: string, @CurrentUser() user: any, @Body('systemPrompt') systemPrompt: string) {
    return this.conversationsService.updateSystemPrompt(id, user.id, systemPrompt || null);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.conversationsService.delete(id, user.id);
  }

  @Post(':id/fork')
  fork(@Param('id') id: string, @CurrentUser() user: any, @Query('upToMessageId') upToMessageId: string) {
    return this.conversationsService.fork(id, user.id, upToMessageId);
  }

  // ── Memory Endpoints ──

  @Get(':id/memories')
  async getMemories(@Param('id') id: string, @CurrentUser() user: any) {
    await this.conversationsService.findOne(id, user.id);
    return this.memoryService.getMemories(id);
  }

  @Post(':id/memories')
  async createMemory(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('type') type: string,
    @Body('content') content: string,
  ) {
    await this.conversationsService.findOne(id, user.id);
    return this.memoryService.createMemory(id, type || 'note', content);
  }

  @Patch(':id/memories/:memoryId')
  async updateMemory(
    @Param('id') id: string,
    @Param('memoryId') memoryId: string,
    @CurrentUser() user: any,
    @Body('content') content: string,
  ) {
    await this.conversationsService.findOne(id, user.id);
    return this.memoryService.updateMemory(memoryId, content);
  }

  @Delete(':id/memories/:memoryId')
  async deleteMemory(
    @Param('id') id: string,
    @Param('memoryId') memoryId: string,
    @CurrentUser() user: any,
  ) {
    await this.conversationsService.findOne(id, user.id);
    return this.memoryService.deleteMemory(memoryId);
  }

  @Post(':id/summarize')
  async triggerSummary(@Param('id') id: string, @CurrentUser() user: any) {
    await this.conversationsService.findOne(id, user.id);
    return this.memoryService.triggerSummary(id);
  }
}
