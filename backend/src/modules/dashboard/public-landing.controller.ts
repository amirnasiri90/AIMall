import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DashboardService } from './dashboard.service';
import { PublicClassifyIntentDto } from './dto/public-classify-intent.dto';
import { LandingIntentRateGuard } from './landing-intent-rate.guard';
import { LandingIntentRateStore } from './landing-intent-rate.store';

/** endpoint عمومی تحلیل قصد برای صفحهٔ اول سایت — فقط با شماره موبایل، بدون JWT/API-Key. */
@ApiTags('public-landing')
@Controller('public/landing')
export class PublicLandingController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly landingIntentRateStore: LandingIntentRateStore,
  ) {}

  @Post('intent/classify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LandingIntentRateGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } }) // 15 درخواست در دقیقه per IP
  @ApiOperation({
    summary: 'تحلیل قصد (صفحهٔ اول)',
    description:
      'بدون احراز هویت؛ با شماره موبایل. محدودیت: ۱۵ درخواست در دقیقه per IP، ۵ درخواست در دقیقه per شماره.',
  })
  async classifyIntent(@Body() dto: PublicClassifyIntentDto) {
    const result = await this.dashboardService.classifyIntent(
      (dto.text || '').trim(),
    );
    return result ?? { href: null, label: null, desc: null };
  }
}
