import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InsightType, StepStatus, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../../common/decorators/auth.decorators';
import { ReadinessService } from './readiness/readiness.service';
import { isUuidLike } from '../../common/utils/is-uuid';
import { assertTransition } from './transaction-state-machine';
import { AuditService } from '../audit/audit.service';
import { InsightsService } from './insights.service';
import {
  mapPaymentStatusLabel,
  quoteSandboxFees,
} from '../payments/sandbox-fee.util';

export type ReviewEligibility = 'READY_FOR_REVIEW' | 'NOT_READY' | 'BLOCKED';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readinessService: ReadinessService,
    private readonly audit: AuditService,
    private readonly insights: InsightsService,
  ) {}

  async getReview(user: RequestUser, idOrRef: string) {
    const tx = await this.loadAuthorized(user, idOrRef);
    const readiness = this.computeReadiness(tx);
    const eligibility = this.evaluateEligibility(readiness);
    const payment = tx.payments[0] ?? null;
    const quote = quoteSandboxFees(tx.service.metadata);
    const paymentRequired = quote.totalAmount > 0;
    const checklist = this.buildChecklist({
      readiness,
      paymentStatus: payment?.status ?? null,
      paymentRequired,
      reviewConfirmed: Boolean(tx.reviewConfirmedAt),
      submitted: Boolean(tx.submittedAt),
    });

    await this.audit.record({
      actorId: user.id,
      action: 'TRANSACTION_UPDATED',
      entityType: 'Transaction',
      entityId: tx.id,
      metadata: { event: 'REVIEW_OPENED', eligibility },
    });

    return {
      transactionId: tx.id,
      referenceCode: tx.referenceCode,
      title: tx.title,
      status: tx.status,
      sandbox: true,
      disclaimer:
        'This is a demonstration transaction. No real payment or government submission will occur.',
      eligibility,
      canProceedToPayment: eligibility === 'READY_FOR_REVIEW',
      reviewConfirmedAt: tx.reviewConfirmedAt,
      service: {
        id: tx.service.id,
        code: tx.service.code,
        nameEn: tx.service.nameEn,
        nameAr: tx.service.nameAr,
        category: tx.service.category,
      },
      applicant: {
        fullName: tx.user.fullName,
        email: tx.user.email,
      },
      fields: tx.fields.map((f) => ({
        code: f.code,
        labelEn: f.labelEn,
        value: f.value,
        source: f.source,
      })),
      documents: tx.documents.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        documentType: d.documentType,
        status: d.status,
      })),
      readiness: {
        score: readiness.score,
        status: readiness.status,
        breakdown: readiness.breakdown,
        issues: readiness.issues,
        missingRequirements: readiness.missingRequirements,
        evaluations: readiness.evaluations,
      },
      blockingIssues: readiness.issues.filter((i) => i.severity === 'error'),
      warnings: readiness.issues.filter((i) => i.severity === 'warning'),
      checklist,
      nextStep:
        eligibility === 'READY_FOR_REVIEW'
          ? tx.reviewConfirmedAt
            ? 'CONTINUE_TO_PAYMENT'
            : 'CONFIRM_REVIEW'
          : eligibility === 'BLOCKED'
            ? 'RESOLVE_BLOCKERS'
            : 'COMPLETE_REQUIREMENTS',
      paymentSummary: {
        required: paymentRequired,
        ...quote,
        statusLabel: mapPaymentStatusLabel(payment?.status, paymentRequired),
      },
    };
  }

  async confirmReview(user: RequestUser, idOrRef: string, confirmed: boolean) {
    if (!confirmed) {
      throw new BadRequestException(
        'Review confirmation is required before continuing to payment',
      );
    }

    const tx = await this.loadAuthorized(user, idOrRef);
    const readiness = this.computeReadiness(tx);
    const eligibility = this.evaluateEligibility(readiness);
    if (eligibility !== 'READY_FOR_REVIEW') {
      throw new BadRequestException(
        `Transaction is not eligible for payment (${eligibility})`,
      );
    }

    const now = new Date();
    if (tx.status !== TransactionStatus.PAYMENT_PENDING) {
      assertTransition(tx.status, TransactionStatus.PAYMENT_PENDING);
    }

    await this.prisma.transaction.update({
      where: { id: tx.id },
      data: {
        reviewConfirmedAt: now,
        status: TransactionStatus.PAYMENT_PENDING,
      },
    });

    await this.prisma.transactionStep.upsert({
      where: {
        transactionId_code: { transactionId: tx.id, code: 'USER_REVIEW' },
      },
      create: {
        transactionId: tx.id,
        code: 'USER_REVIEW',
        labelEn: 'User Review',
        labelAr: 'مراجعة المستخدم',
        sortOrder: 5,
        status: StepStatus.COMPLETED,
        completedAt: now,
        startedAt: now,
        meta: { sandboxConfirmation: true },
      },
      update: {
        status: StepStatus.COMPLETED,
        completedAt: now,
        meta: { sandboxConfirmation: true },
      },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'FINAL_REVIEW_COMPLETED',
      entityType: 'Transaction',
      entityId: tx.id,
      metadata: { sandbox: true, confirmed: true },
    });

    await this.insights.upsertInsights(tx.id, [
      {
        type: InsightType.FINAL_REVIEW,
        title: 'Final review confirmed',
        summary:
          'Sandbox review confirmation recorded. You may continue to sandbox payment.',
        severity: 'info',
      },
    ]);

    return this.getReview(user, tx.id);
  }

  evaluateEligibility(readiness: {
    status: string;
    issues: Array<{ severity: string }>;
    missingRequirements: Array<{ status: string; type?: string }>;
  }): ReviewEligibility {
    if (readiness.status === 'BLOCKED') return 'BLOCKED';
    const hasBlocking = readiness.issues.some((i) => i.severity === 'error');
    if (hasBlocking) return 'BLOCKED';
    const missingMandatory = readiness.missingRequirements.filter(
      (m) => m.status === 'MISSING',
    );
    if (missingMandatory.length > 0) return 'NOT_READY';
    if (
      readiness.status === 'NOT_STARTED' ||
      readiness.status === 'IN_PROGRESS'
    ) {
      return 'NOT_READY';
    }
    return 'READY_FOR_REVIEW';
  }

  buildChecklist(input: {
    readiness: {
      score: number;
      status: string;
      breakdown: {
        documents: { completed: number; required: number; score: number };
        information: { completed: number; required: number; score: number };
        validation: { score: number };
      };
      issues: Array<{ severity: string }>;
      missingRequirements: Array<{ status: string }>;
    };
    paymentStatus: string | null;
    paymentRequired: boolean;
    reviewConfirmed: boolean;
    submitted: boolean;
  }) {
    const infoComplete =
      input.readiness.breakdown.information.completed >=
      input.readiness.breakdown.information.required;
    const docsComplete =
      input.readiness.breakdown.documents.completed >=
      input.readiness.breakdown.documents.required;
    const warningCount = input.readiness.issues.filter(
      (i) => i.severity === 'warning',
    ).length;
    const blocked = input.readiness.status === 'BLOCKED';
    const paid =
      input.paymentStatus === 'SANDBOX_PAID' ||
      input.paymentStatus === 'WAIVED';

    return [
      {
        code: 'APPLICATION_INFORMATION',
        label: 'Application information',
        description: infoComplete
          ? 'Complete'
          : 'Required fields are incomplete',
        status: infoComplete ? 'COMPLETE' : 'INCOMPLETE',
        blocking: !infoComplete,
      },
      {
        code: 'DOCUMENTS',
        label: 'Documents',
        description: docsComplete
          ? 'Complete'
          : 'Required documents are missing',
        status: docsComplete ? 'COMPLETE' : 'INCOMPLETE',
        blocking: !docsComplete,
      },
      {
        code: 'VALIDATION',
        label: 'Document validation',
        description: blocked
          ? 'Blocked by invalid documents'
          : warningCount > 0
            ? `${warningCount} warning(s)`
            : 'Passed',
        status: blocked ? 'BLOCKED' : warningCount > 0 ? 'WARNING' : 'COMPLETE',
        blocking: blocked,
      },
      {
        code: 'PAYMENT',
        label: 'Payment',
        description: !input.paymentRequired
          ? 'Not required'
          : paid
            ? 'Completed (sandbox)'
            : 'Not completed',
        status: !input.paymentRequired
          ? 'NOT_REQUIRED'
          : paid
            ? 'COMPLETE'
            : 'PENDING',
        blocking: false,
      },
      {
        code: 'SUBMISSION',
        label: 'Submission readiness',
        description: input.submitted
          ? 'Submitted (sandbox)'
          : input.reviewConfirmed
            ? 'Review confirmed — ready for payment/submit path'
            : 'Not submitted',
        status: input.submitted
          ? 'COMPLETE'
          : input.reviewConfirmed
            ? 'READY'
            : 'PENDING',
        blocking: false,
      },
    ];
  }

  private computeReadiness(tx: {
    service: {
      requirements: Array<{
        id: string;
        code: string;
        type: string;
        labelEn: string;
        labelAr: string;
        isMandatory: boolean;
        documentType: string | null;
        sortOrder: number;
      }>;
    };
    fields: Array<{ code: string; value: string | null }>;
    documents: Array<{
      id: string;
      documentType: string | null;
      status: string;
      fileName: string;
    }>;
  }) {
    return this.readinessService.calculate({
      requirements: tx.service.requirements.map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type as 'FIELD' | 'DOCUMENT' | 'CONSENT' | 'PAYMENT',
        labelEn: r.labelEn,
        labelAr: r.labelAr,
        isMandatory: r.isMandatory,
        documentType: r.documentType,
        sortOrder: r.sortOrder,
      })),
      fields: tx.fields.map((f) => ({ code: f.code, value: f.value })),
      documents: tx.documents.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        status: d.status,
        fileName: d.fileName,
      })),
    });
  }

  private async loadAuthorized(user: RequestUser, idOrRef: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: isUuidLike(idOrRef)
        ? { OR: [{ id: idOrRef }, { referenceCode: idOrRef }] }
        : { referenceCode: idOrRef },
      include: {
        user: true,
        service: {
          include: { requirements: { orderBy: { sortOrder: 'asc' } } },
        },
        fields: { orderBy: { code: 'asc' } },
        documents: { orderBy: { createdAt: 'asc' } },
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
