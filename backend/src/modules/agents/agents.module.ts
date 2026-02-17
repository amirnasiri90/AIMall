import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { getJwtSecret } from '../../common/config/secrets';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { ProvidersModule } from '../providers/providers.module';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [
    ProvidersModule,
    UsersModule,
    MessagesModule,
    ConversationsModule,
    OrganizationsModule,
    PolicyModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
