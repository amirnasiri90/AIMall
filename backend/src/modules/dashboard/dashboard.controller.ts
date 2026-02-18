import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@UseGuards(ApiKeyAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getOverview(user.id, { from, to });
  }

  @Get('menu-flags')
  getMenuFlags() {
    return this.dashboardService.getMenuFlags();
  }

  @Post('intent/classify')
  async classifyIntent(@Body('text') text: string) {
    return this.dashboardService.classifyIntent(text || '');
  }
}
