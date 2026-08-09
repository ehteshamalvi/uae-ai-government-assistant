import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ServicesModule } from './modules/services/services.module';
import { RequirementsModule } from './modules/requirements/requirements.module';
import { IntentModule } from './modules/intent/intent.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DocumentAnalysisModule } from './modules/document-analysis/document-analysis.module';
import { AiModule } from './modules/ai/ai.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { CopilotModule } from './modules/copilot/copilot.module';
import { DemoModule } from './modules/demo/demo.module';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('throttle.ttlMs') ?? 60_000,
          limit: config.get<number>('throttle.limit') ?? 120,
        },
      ],
    }),
    PrismaModule,
    RedisModule,
    DemoModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ServicesModule,
    RequirementsModule,
    IntentModule,
    TransactionsModule,
    DocumentsModule,
    DocumentAnalysisModule,
    AiModule,
    WorkflowModule,
    PaymentsModule,
    NotificationsModule,
    AuditModule,
    CopilotModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class AppModule {}
