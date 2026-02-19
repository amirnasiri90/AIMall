import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { PublicLandingController } from './public-landing.controller';
import { DashboardService } from './dashboard.service';
import { LandingIntentRateStore } from './landing-intent-rate.store';
import { LandingIntentRateGuard } from './landing-intent-rate.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [PrismaModule, ApiKeysModule, ProvidersModule],
  controllers: [DashboardController, PublicLandingController],
  providers: [DashboardService, LandingIntentRateStore, LandingIntentRateGuard],
  exports: [DashboardService],
})
export class DashboardModule {}
