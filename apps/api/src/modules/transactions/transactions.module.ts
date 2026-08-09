import { Module, forwardRef } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { ReadinessService } from './readiness/readiness.service';
import { RequirementsModule } from '../requirements/requirements.module';
import { InsightsService } from './insights.service';
import { DocumentAnalysisModule } from '../document-analysis/document-analysis.module';
import { ReviewService } from './review.service';
import { LifecycleService } from './lifecycle.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    RequirementsModule,
    forwardRef(() => DocumentAnalysisModule),
    AuditModule,
    NotificationsModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    ReadinessService,
    InsightsService,
    ReviewService,
    LifecycleService,
  ],
  exports: [
    TransactionsService,
    ReadinessService,
    InsightsService,
    ReviewService,
    LifecycleService,
  ],
})
export class TransactionsModule {}
