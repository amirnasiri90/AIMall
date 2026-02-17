import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('jobs')
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body('type') type: string,
    @Body('payload') payload: Record<string, any>,
  ) {
    if (!type) throw new Error('نوع کار الزامی است');
    return this.jobsService.create(user.id, type, payload || {});
  }

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.jobsService.list(user.id, Number(page) || 1, Number(limit) || 20, status);
  }

  @Get(':id')
  getStatus(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.getStatus(user.id, id);
  }
}
