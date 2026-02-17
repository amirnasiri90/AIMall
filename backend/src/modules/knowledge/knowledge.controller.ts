import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('knowledge')
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  @Post('bases')
  createBase(
    @CurrentUser() user: any,
    @Body('name') name: string,
    @Body('organizationId') organizationId?: string,
  ) {
    return this.knowledgeService.createKnowledgeBase(user.id, name, organizationId);
  }

  @Get('bases')
  listBases(
    @CurrentUser() user: any,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.knowledgeService.listKnowledgeBases(user.id, organizationId);
  }

  @Post('bases/:kbId/documents')
  addDocument(
    @Param('kbId') kbId: string,
    @CurrentUser() user: any,
    @Body('name') name: string,
    @Body('content') content: string,
  ) {
    return this.knowledgeService.addDocument(kbId, user.id, name || 'سند', content || '');
  }

  @Get('bases/:kbId/documents')
  getDocuments(@Param('kbId') kbId: string, @CurrentUser() user: any) {
    return this.knowledgeService.getDocuments(kbId, user.id);
  }

  @Get('bases/:kbId/search')
  search(
    @Param('kbId') kbId: string,
    @CurrentUser() user: any,
    @Query('q') q: string,
    @Query('topK') topK?: string,
  ) {
    return this.knowledgeService.search(kbId, user.id, q || '', topK ? parseInt(topK, 10) : 5);
  }

  @Delete('bases/:kbId/documents/:docId')
  deleteDocument(
    @Param('kbId') kbId: string,
    @Param('docId') docId: string,
    @CurrentUser() user: any,
  ) {
    return this.knowledgeService.deleteDocument(kbId, user.id, docId);
  }

  @Delete('bases/:kbId')
  deleteBase(@Param('kbId') kbId: string, @CurrentUser() user: any) {
    return this.knowledgeService.deleteKnowledgeBase(kbId, user.id);
  }
}
