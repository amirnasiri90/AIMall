import { Module } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';
import { XaiService } from './xai.service';
import { ProviderManagerService } from './provider-manager.service';
import { HealthCheckService } from './health-check.service';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [AiProvidersModule],
  providers: [OpenRouterService, XaiService, ProviderManagerService, HealthCheckService],
  exports: [OpenRouterService, XaiService, ProviderManagerService, HealthCheckService],
})
export class ProvidersModule {}
