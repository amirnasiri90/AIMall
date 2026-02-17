import { Controller, Get, Post, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('support')
@UseGuards(ApiKeyAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body('subject') subject: string,
    @Body('body') body: string,
    @Body('category') category?: string,
  ) {
    if (!subject?.trim() || !body?.trim()) throw new BadRequestException('موضوع و متن پیام الزامی است');
    return this.supportService.create(user.id, subject.trim(), body.trim(), category);
  }

  @Get()
  findMyTickets(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.supportService.findMyTickets(user.id, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.supportService.findOneForUser(id, user.id);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('content') content: string,
  ) {
    if (!content?.trim()) throw new BadRequestException('متن پیام الزامی است');
    return this.supportService.addMessage(id, user.id, content.trim(), false);
  }
}
