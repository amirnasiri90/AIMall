import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { ProvidersModule } from '../providers/providers.module';
import { UsersModule } from '../users/users.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [ProvidersModule, UsersModule, PolicyModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
