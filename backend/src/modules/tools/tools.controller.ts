import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('tools')
export class ToolsController {
  constructor(private toolsService: ToolsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getTools(@Query('enabled') enabled?: string) {
    return this.toolsService.getTools(enabled === 'true');
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories')
  getCategories() {
    return this.toolsService.getCategories();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':name')
  getTool(@Param('name') name: string) {
    return this.toolsService.getTool(name);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':name/execute')
  executeTool(@Param('name') name: string, @Body('input') input: string) {
    return this.toolsService.executeTool(name, input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':name')
  updateTool(
    @Param('name') name: string,
    @Body() body: { isEnabled?: boolean; config?: Record<string, any> },
  ) {
    return this.toolsService.updateTool(name, body);
  }
}
