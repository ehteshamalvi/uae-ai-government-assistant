import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InsightType,
  NotificationType,
  PaymentStatus,
  StepStatus,
  TransactionStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../../common/decorators/auth.decorators';
import { isUuidLike } from '../../common/utils/is-uuid';
import {
  assertTransition,
  nextSandboxAdvance,
} from './transaction-state-machine';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InsightsService } from './insights.service';
import { ReviewService } from './review.service';
import {
  mapPaymentStatusLabel,
  quoteSandboxFees,
} from '../payments/sandbox-fee.util';
import { DemoModeService } from '../demo/demo-mode.service';

@Injectable()
export class LifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly insights: InsightsService,
    private readonly review: ReviewService,
    private readonly demoMode: DemoModeService,
  ) {}

  async submit(user: RequestUser, idOrRef: string) {
    const tx = await this.loadTx(user, idOrRef);
    if (!tx.sandbox) {
      throw new BadRequestException(
        'Only sandbox transactions can be submitted here',
      );
    }
    if (!tx.reviewConfirmedAt) {
      throw new BadRequestException(
        'Final review must be confirmed before submission',
      );
    }

    const review = await this.review.getReview(user, tx.id);
    if (review.eligibility === 'BLOCKED') {
      throw new BadRequestException('Cannot submit: transaction is BLOCKED');
    }
    if (review.eligibility === 'NOT_READY') {
      throw new BadRequestException(
        'Cannot submit: requirements are incomplete',
      );
    }

    const quote = quoteSandboxFees(tx.service.metadata);
    const payment = tx.payments[0];
    if (quote.totalAmount > 0) {
      if (!payment || payment.status !== PaymentStatus.SANDBOX_PAID) {
        throw new BadRequestException(
          'Sandbox payment must be completed before submission',
        );
      }
    }

    if (tx.submittedAt && tx.submissionReference) {
      return {
        transactionId: tx.id,
        referenceCode: tx.referenceCode,
        submissionReference: tx.submissionReference,
        submittedAt: tx.submittedAt,
        status: tx.status,
        label: 'Sandbox Submission',
        disclaimer:
          'This is a demonstration submission. No government department received this application.',
      };
    }

    assertTransition(tx.status, TransactionStatus.SUBMITTED);

    const submissionReference = this.generateSubmissionRef();
    const now = new Date();

    await this.prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: TransactionStatus.SUBMITTED,
        submittedAt: now,
        submissionReference,
      },
    });

    await this.prisma.transactionStep.upsert({
      where: {
        transactionId_code: { transactionId: tx.id, code: 'SUBMISSION' },
      },
      create: {
        transactionId: tx.id,
        code: 'SUBMISSION',
        labelEn: 'Submission',
        labelAr: 'التقديم',
        sortOrder: 6,
        status: StepStatus.COMPLETED,
        completedAt: now,
        startedAt: now,
        meta: { submissionReference, sandbox: true },
      },
      update: {
        status: StepStatus.COMPLETED,
        completedAt: now,
        meta: { submissionReference, sandbox: true },
      },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'SANDBOX_SUBMISSION',
      entityType: 'Transaction',
      entityId: tx.id,
      metadata: { submissionReference, sandbox: true },
    });

    await this.notifications.create({
      userId: tx.userId,
      transactionId: tx.id,
      type: NotificationType.SUCCESS,
      title: 'Application submitted (sandbox)',
      body: `Sandbox submission ${submissionReference} recorded for ${tx.referenceCode}.`,
    });

    await this.insights.upsertInsights(tx.id, [
      {
        type: InsightType.MONITORING,
        title: 'Application submitted',
        summary: 'Your application has been submitted successfully (sandbox).',
        severity: 'info',
      },
    ]);

    return {
      transactionId: tx.id,
      referenceCode: tx.referenceCode,
      submissionReference,
      submittedAt: now,
      status: TransactionStatus.SUBMITTED,
      label: 'Sandbox Submission',
      disclaimer:
        'This is a demonstration submission. No government department received this application.',
    };
  }

  async getMonitor(user: RequestUser, idOrRef: string) {
    const tx = await this.loadTx(user, idOrRef);
    const payment = tx.payments[0] ?? null;
    const quote = quoteSandboxFees(tx.service.metadata);
    const audits = await this.audit.listForEntity('Transaction', tx.id, 15);
    const paymentAudits = payment
      ? await this.audit.listForEntity('Payment', payment.id, 5)
      : [];

    const timeline = this.buildTimeline(tx);
    const currentStep =
      timeline.find((t) => t.state === 'current') ??
      timeline.find((t) => t.state === 'completed');

    const insight = this.monitoringInsight(tx.status);

    return {
      transactionId: tx.id,
      referenceCode: tx.referenceCode,
      submissionReference: tx.submissionReference,
      title: tx.title,
      status: tx.status,
      sandbox: true,
      disclaimer:
        'SANDBOX DEMO — Status progression is simulated. No real government processing occurs.',
      service: {
        id: tx.service.id,
        code: tx.service.code,
        nameEn: tx.service.nameEn,
        nameAr: tx.service.nameAr,
      },
      currentStep: currentStep
        ? {
            code: currentStep.code,
            label: currentStep.title,
            state: currentStep.state,
          }
        : null,
      timeline,
      payment: {
        statusLabel: mapPaymentStatusLabel(
          payment?.status,
          quote.totalAmount > 0,
        ),
        status: payment?.status ?? null,
        totalAmount: payment ? Number(payment.totalAmount) : quote.totalAmount,
        paidAt: payment?.paidAt ?? null,
      },
      estimatedNextStep: this.estimatedNext(tx.status),
      recentActivity: [...audits, ...paymentAudits]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 12)
        .map((a) => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          createdAt: a.createdAt,
          metadata: a.metadata,
        })),
      insight,
      canAdvanceSandbox:
        this.demoMode.allowSandboxControls() &&
        Boolean(nextSandboxAdvance(tx.status)) &&
        tx.sandbox,
      demoMode: this.demoMode.isEnabled(),
      sandboxControls: this.demoMode.allowSandboxControls(),
    };
  }

  async sandboxAdvance(user: RequestUser, idOrRef: string) {
    this.demoMode.assertSandboxControlsAllowed('Sandbox advance');
    const tx = await this.loadTx(user, idOrRef);
    if (!tx.sandbox) {
      throw new ForbiddenException('Sandbox advance is demo-only');
    }
    const next = nextSandboxAdvance(tx.status);
    if (!next) {
      throw new BadRequestException(
        `No further sandbox advance from status ${tx.status}`,
      );
    }
    assertTransition(tx.status, next);

    await this.prisma.transaction.update({
      where: { id: tx.id },
      data: { status: next },
    });

    if (next === TransactionStatus.PROCESSING) {
      await this.ensureStep(
        tx.id,
        'PROCESSING',
        'Processing',
        'قيد المعالجة',
        7,
        StepStatus.IN_PROGRESS,
      );
    }
    if (next === TransactionStatus.COMPLETED) {
      await this.ensureStep(
        tx.id,
        'PROCESSING',
        'Processing',
        'قيد المعالجة',
        7,
        StepStatus.COMPLETED,
      );
      await this.ensureStep(
        tx.id,
        'COMPLETED',
        'Completed',
        'مكتمل',
        8,
        StepStatus.COMPLETED,
      );
    }

    await this.audit.record({
      actorId: user.id,
      action: 'SANDBOX_ADVANCED',
      entityType: 'Transaction',
      entityId: tx.id,
      metadata: { from: tx.status, to: next, sandbox: true },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'STATUS_CHANGED',
      entityType: 'Transaction',
      entityId: tx.id,
      metadata: { from: tx.status, to: next },
    });

    await this.notifications.create({
      userId: tx.userId,
      transactionId: tx.id,
      type:
        next === TransactionStatus.COMPLETED
          ? NotificationType.SUCCESS
          : NotificationType.INFO,
      title: `Status updated: ${next}`,
      body: `Sandbox transaction ${tx.referenceCode} advanced to ${next}.`,
    });

    await this.insights.upsertInsights(tx.id, [
      {
        type: InsightType.MONITORING,
        title: this.monitoringInsight(next).title,
        summary: this.monitoringInsight(next).summary,
        severity: 'info',
      },
    ]);

    return this.getMonitor(user, tx.id);
  }

  /**
   * Demo-only: reset seeded TRX-9824-A71-like state for a sandbox transaction
   * owned by the demo user — restores PREPARING + clears payment/submission.
   */
  async demoReset(user: RequestUser, idOrRef: string) {
    this.demoMode.assertSandboxControlsAllowed('Demo reset');
    const tx = await this.loadTx(user, idOrRef);
    if (!tx.sandbox) {
      throw new ForbiddenException('Demo reset is sandbox-only');
    }

    await this.prisma.payment.deleteMany({ where: { transactionId: tx.id } });
    await this.prisma.notification.deleteMany({
      where: { transactionId: tx.id },
    });

    await this.prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: TransactionStatus.PREPARING,
        submittedAt: null,
        submissionReference: null,
        reviewConfirmedAt: null,
      },
    });

    await this.prisma.transactionStep.updateMany({
      where: {
        transactionId: tx.id,
        code: {
          in: [
            'USER_REVIEW',
            'PAYMENT',
            'SUBMISSION',
            'PROCESSING',
            'COMPLETED',
          ],
        },
      },
      data: {
        status: StepStatus.PENDING,
        completedAt: null,
        startedAt: null,
      },
    });

    await this.prisma.transactionStep.updateMany({
      where: { transactionId: tx.id, code: 'APPLICATION_PREPARED' },
      data: { status: StepStatus.IN_PROGRESS, completedAt: null },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'TRANSACTION_UPDATED',
      entityType: 'Transaction',
      entityId: tx.id,
      metadata: { event: 'DEMO_RESET', sandbox: true },
    });

    return {
      reset: true,
      referenceCode: tx.referenceCode,
      status: TransactionStatus.PREPARING,
      message:
        'Sandbox transaction reset for demo. Payments/submission cleared.',
    };
  }

  private monitoringInsight(status: TransactionStatus) {
    switch (status) {
      case TransactionStatus.SUBMITTED:
        return {
          title: 'Submitted',
          summary: 'Your application has been submitted successfully.',
        };
      case TransactionStatus.PROCESSING:
      case TransactionStatus.UNDER_REVIEW:
        return {
          title: 'Processing',
          summary: 'Your transaction is currently being processed (sandbox).',
        };
      case TransactionStatus.COMPLETED:
      case TransactionStatus.ISSUED:
      case TransactionStatus.APPROVED:
        return {
          title: 'Completed',
          summary: 'Your application has reached sandbox completion.',
        };
      case TransactionStatus.PAYMENT_PENDING:
        return {
          title: 'Payment',
          summary: 'Complete sandbox payment to submit your application.',
        };
      default:
        return {
          title: 'In progress',
          summary: 'Continue preparing your sandbox transaction.',
        };
    }
  }

  private estimatedNext(status: TransactionStatus): string {
    const next = nextSandboxAdvance(status);
    if (next) return next;
    if (status === TransactionStatus.PAYMENT_PENDING) return 'SUBMIT';
    if (status === TransactionStatus.READY_FOR_REVIEW) return 'CONFIRM_REVIEW';
    if (status === TransactionStatus.COMPLETED) return 'DONE';
    return 'CONTINUE';
  }

  private buildTimeline(tx: {
    status: TransactionStatus;
    steps: Array<{
      code: string;
      labelEn: string;
      status: string;
      completedAt: Date | null;
      startedAt: Date | null;
    }>;
    reviewConfirmedAt: Date | null;
    submittedAt: Date | null;
    payments: Array<{ status: string; paidAt: Date | null }>;
  }) {
    const stepMap = new Map(tx.steps.map((s) => [s.code, s]));
    const paid = tx.payments[0]?.status === PaymentStatus.SANDBOX_PAID;

    const defs = [
      { code: 'SERVICE_IDENTIFIED', title: 'Service Identified' },
      { code: 'REQUIREMENTS_CHECKED', title: 'Requirements Checked' },
      { code: 'DOCUMENTS_VALIDATED', title: 'Documents Validated' },
      { code: 'APPLICATION_PREPARED', title: 'Application Prepared' },
      { code: 'USER_REVIEW', title: 'Final Review' },
      { code: 'PAYMENT', title: 'Payment' },
      { code: 'SUBMISSION', title: 'Application Submitted' },
      { code: 'PROCESSING', title: 'Processing' },
      { code: 'COMPLETED', title: 'Completed' },
    ];

    return defs.map((d) => {
      const step = stepMap.get(d.code);
      let state: 'completed' | 'current' | 'upcoming' = 'upcoming';
      let subtitle = 'Pending';

      if (d.code === 'USER_REVIEW' && tx.reviewConfirmedAt) {
        state = 'completed';
        subtitle = `Confirmed ${tx.reviewConfirmedAt.toISOString()}`;
      } else if (d.code === 'PAYMENT' && paid) {
        state = 'completed';
        subtitle = `Paid ${tx.payments[0]?.paidAt?.toISOString() ?? ''}`;
      } else if (d.code === 'SUBMISSION' && tx.submittedAt) {
        state = 'completed';
        subtitle = `Submitted ${tx.submittedAt.toISOString()}`;
      } else if (d.code === 'PROCESSING') {
        if (tx.status === TransactionStatus.PROCESSING) {
          state = 'current';
          subtitle = 'Currently processing (sandbox)';
        } else if (
          tx.status === TransactionStatus.COMPLETED ||
          tx.status === TransactionStatus.ISSUED ||
          tx.status === TransactionStatus.APPROVED
        ) {
          state = 'completed';
          subtitle = 'Processing finished';
        }
      } else if (d.code === 'COMPLETED') {
        if (
          tx.status === TransactionStatus.COMPLETED ||
          tx.status === TransactionStatus.ISSUED
        ) {
          state = 'completed';
          subtitle = 'Sandbox completed';
        }
      } else if (step?.status === 'COMPLETED') {
        state = 'completed';
        subtitle = step.completedAt
          ? `Completed ${step.completedAt.toISOString()}`
          : 'Completed';
      } else if (step?.status === 'IN_PROGRESS') {
        state = 'current';
        subtitle = 'In progress';
      }

      if (
        d.code === 'SUBMISSION' &&
        tx.status === TransactionStatus.SUBMITTED &&
        state === 'completed'
      ) {
        // keep completed; processing is next current
      }

      return {
        code: d.code,
        title: d.title,
        subtitle,
        state,
      };
    });
  }

  private async ensureStep(
    transactionId: string,
    code: string,
    labelEn: string,
    labelAr: string,
    sortOrder: number,
    status: StepStatus,
  ) {
    const now = new Date();
    await this.prisma.transactionStep.upsert({
      where: { transactionId_code: { transactionId, code } },
      create: {
        transactionId,
        code,
        labelEn,
        labelAr,
        sortOrder,
        status,
        startedAt: now,
        completedAt: status === StepStatus.COMPLETED ? now : null,
      },
      update: {
        status,
        startedAt: now,
        completedAt: status === StepStatus.COMPLETED ? now : null,
      },
    });
  }

  private generateSubmissionRef() {
    const year = new Date().getFullYear();
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `SUB-${year}-${suffix}`;
  }

  private async loadTx(user: RequestUser, idOrRef: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: isUuidLike(idOrRef)
        ? { OR: [{ id: idOrRef }, { referenceCode: idOrRef }] }
        : { referenceCode: idOrRef },
      include: {
        service: true,
        steps: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!tx) throw new NotFoundException(`Transaction not found: ${idOrRef}`);
    if (!user.isAdmin && tx.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }
    return tx;
  }
}
