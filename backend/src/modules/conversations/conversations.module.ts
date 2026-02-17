import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessagesModule } from '../messages/messages.module';
import { MemoryModule } from '../memory/memory.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [MessagesModule, MemoryModule, ApiKeysModule, OrganizationsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
