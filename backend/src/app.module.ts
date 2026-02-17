import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PolicyThrottleInterceptor } from './modules/policy/policy-throttle.interceptor';
import { QueueModule } from './modules/queue/queue.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { ChatModule } from './modules/chat/chat.module';
import { TextModule } from './modules/text/text.module';
import { ImageModule } from './modules/image/image.module';
import { AudioModule } from './modules/audio/audio.module';
import { VideoModule } from './modules/video/video.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { AgentsModule } from './modules/agents/agents.module';
import { MemoryModule } from './modules/memory/memory.module';
import { ToolsModule } from './modules/tools/tools.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { AuditModule } from './modules/audit/audit.module';
import { SlaModule } from './modules/sla/sla.module';
import { PolicyModule } from './modules/policy/policy.module';
import { JobsQueueModule } from './modules/jobs/jobs-queue.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SupportModule } from './modules/support/support.module';
import { PersianPdfModule } from './modules/persian-pdf/persian-pdf.module';
import { SmsModule } from './modules/sms/sms.module';
import { AiProvidersModule } from './modules/ai-providers/ai-providers.module';
import { HealthController } from './health.controller';

const useRedis = !!(process.env.REDIS_URL && process.env.REDIS_URL.length > 0);

@Module({
  controllers: [HealthController],
  imports: [
    QueueModule.forRoot(),
    ...(useRedis ? [JobsQueueModule] : []),
    ThrottlerModule.forRoot([
      { name: 'api', ttl: 60_000, limit: Number(process.env.THROTTLE_LIMIT) || 100 },
    ]),
    PrismaModule,
    SettingsModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    ProvidersModule,
    OrchestratorModule,
    ChatModule,
    TextModule,
    ImageModule,
    AudioModule,
    VideoModule,
    BillingModule,
    DashboardModule,
    AdminModule,
    AgentsModule,
    MemoryModule,
    ToolsModule,
    ApiKeysModule,
    OrganizationsModule,
    JobsModule,
    MetricsModule,
    SlaModule,
    PolicyModule,
    KnowledgeModule,
    WorkflowsModule,
    SupportModule,
    PersianPdfModule,
    SmsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: PolicyThrottleInterceptor },
  ],
})
export class AppModule {}
