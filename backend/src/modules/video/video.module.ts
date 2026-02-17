import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [AiProvidersModule, ApiKeysModule],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
