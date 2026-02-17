import { Module, forwardRef } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { OpenAIImagesService } from './openai-images.service';
import { UsersModule } from '../users/users.module';
import { ProvidersModule } from '../providers/providers.module';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { JobsModule } from '../jobs/jobs.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [UsersModule, ProvidersModule, AiProvidersModule, ApiKeysModule, OrganizationsModule, forwardRef(() => JobsModule)],
  controllers: [ImageController],
  providers: [ImageService, OpenAIImagesService],
  exports: [ImageService],
})
export class ImageModule {}
