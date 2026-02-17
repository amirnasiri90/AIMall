import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  json() {
    return this.metricsService.getSnapshot();
  }

  @Get('prometheus')
  prometheus() {
    return this.metricsService.getPrometheusStyle();
  }
}
