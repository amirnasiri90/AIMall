import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workflows')
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body('name') name: string,
    @Body('definition') definition: any,
    @Body('organizationId') organizationId?: string,
  ) {
    return this.workflowsService.create(user.id, name, definition || { steps: [] }, organizationId);
  }

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.workflowsService.list(user.id, organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.findOne(id, user.id);
  }

  @Post(':id/run')
  run(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('input') input: Record<string, any>,
    @Body('async') async?: boolean,
  ) {
    return this.workflowsService.run(id, user.id, input || {}, !!async);
  }

  @Get(':id/runs')
  getRuns(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.workflowsService.getRuns(id, user.id, limit ? parseInt(limit, 10) : 20);
  }

  @Get(':id/runs/:runId')
  findRun(
    @Param('id') id: string,
    @Param('runId') runId: string,
    @CurrentUser() user: any,
  ) {
    return this.workflowsService.findRun(id, runId, user.id);
  }
}
