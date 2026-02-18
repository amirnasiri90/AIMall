import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BrandingController } from './branding.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { BillingModule } from '../billing/billing.module';
import { ProvidersModule } from '../providers/providers.module';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [UsersModule, BillingModule, ProvidersModule, AiProvidersModule, SupportModule],
  controllers: [AdminController, BrandingController],
  providers: [AdminService],
})
export class AdminModule {}
