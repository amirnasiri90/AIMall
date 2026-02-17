import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiProviderConfigService } from './ai-provider-config.service';
import { ServiceMappingService } from './service-mapping.service';
import { ProviderResolverService } from './provider-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [AiProviderConfigService, ServiceMappingService, ProviderResolverService],
  exports: [AiProviderConfigService, ServiceMappingService, ProviderResolverService],
})
export class AiProvidersModule {}
