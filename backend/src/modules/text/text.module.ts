import { Module } from '@nestjs/common';
import { TextController } from './text.controller';
import { TextService } from './text.service';
import { ProvidersModule } from '../providers/providers.module';
import { UsersModule } from '../users/users.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [ProvidersModule, UsersModule, ApiKeysModule, OrganizationsModule],
  controllers: [TextController],
  providers: [TextService],
})
export class TextModule {}
