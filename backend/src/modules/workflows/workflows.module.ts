import { Module, forwardRef } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { ProvidersModule } from '../providers/providers.module';
import { ToolsModule } from '../tools/tools.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [ProvidersModule, ToolsModule, forwardRef(() => JobsModule)],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowExecutorService],
  exports: [WorkflowsService, WorkflowExecutorService],
})
export class WorkflowsModule {}
