import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ProvidersModule } from '../providers/providers.module';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';
import { MemoryModule } from '../memory/memory.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [
    ProvidersModule,
    UsersModule,
    MessagesModule,
    MemoryModule,
    ApiKeysModule,
    PolicyModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
