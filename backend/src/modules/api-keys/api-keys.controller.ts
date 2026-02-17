import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: any,
    @Body('name') name: string,
    @Body('scopes') scopes?: string,
  ) {
    if (!name?.trim()) throw new Error('نام کلید الزامی است');
    return this.apiKeysService.create(user.id, name.trim(), scopes);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser() user: any) {
    return this.apiKeysService.findAllByUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.apiKeysService.delete(user.id, id);
  }
}
