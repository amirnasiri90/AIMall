import { Module, forwardRef } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobProcessorService } from './job-processor.service';
import { JobRunnerService } from './job-runner.service';
import { ImageModule } from '../image/image.module';
import { AudioModule } from '../audio/audio.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [
    forwardRef(() => ImageModule),
    forwardRef(() => AudioModule),
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [JobsController],
  providers: [JobsService, JobRunnerService, JobProcessorService],
  exports: [JobsService, JobRunnerService],
})
export class JobsModule {}
