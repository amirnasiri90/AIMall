import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('sla')
@Controller('sla')
export class SlaController {
  constructor(private slaService: SlaService) {}

  /** وضعیت SLA (برای ادمین و مانیتورینگ) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('status')
  getStatus() {
    return this.slaService.getStatus();
  }

  /** اهداف SLA (برای ادمین) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('targets')
  getTargets() {
    return this.slaService.getTargets();
  }

  /** به‌روزرسانی اهداف SLA */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('targets')
  updateTargets(
    @Body() body: { uptimePercentMin?: number; p95LatencyMsMax?: number },
  ) {
    return this.slaService.updateTargets(body);
  }

  /** گزارش SLA (وضعیت + اهداف) برای گزارش‌گیری */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('report')
  getReport() {
    return this.slaService.getReport();
  }
}
