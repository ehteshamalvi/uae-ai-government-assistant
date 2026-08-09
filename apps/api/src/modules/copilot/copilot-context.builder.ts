import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../../common/decorators/auth.decorators';
import { isUuidLike } from '../../common/utils/is-uuid';
import { ReadinessService } from '../transactions/readiness/readiness.service';
import { calculateNextAction } from '../transactions/next-action.service';
import {
  mapPaymentStatusLabel,
  quoteSandboxFees,
} from '../payments/sandbox-fee.util';
import type { CopilotQueryClass } from './copilot-query.classifier';

export interface CopilotTransactionContext {
  referenceCode: string;
  title: string;
  status: string;
  service: { code: string; nameEn: string };
  readiness: {
    score: number;
    status: string;
    breakdown: {
      documents: { score: number; completed: number; required: number };
      information: { score: number; completed: number; required: number };
      validation: { score: number };
    };
    issues: Array<{ severity: string; message: string; code: string }>;
    missingRequirements: Array<{
      code: string;
      labelEn: string;
      type: string;
      status: string;
    }>;
  };
  fields: Array<{
    code: string;
    labelEn: string;
    value: string | null;
    source: string;
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    documentType: string | null;
    status: string;
    analysisSummary: string | null;
  }>;
  payment: {
    statusLabel: string;
    totalAmount: number;
    required: boolean;
  };
  submissionReference: string | null;
  submittedAt: string | null;
  reviewConfirmedAt: string | null;
  nextAction: { code: string; label: string; reason: string };
  timelineSteps: Array<{ code: string; labelEn: string; status: string }>;
  focus?: {
    documents?: boolean;
    readiness?: boolean;
    missing?: boolean;
    payment?: boolean;
    status?: boolean;
  };
}

@Injectable()
export class CopilotContextBuilder {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readiness: ReadinessService,
  ) {}

  async build(
    user: RequestUser,
    transactionIdOrRef: string | null | undefined,
    queryClass: CopilotQueryClass,
    documentId?: string | null,
  ): Promise<CopilotTransactionContext | null> {
    if (!transactionIdOrRef) return null;

    const tx = await this.prisma.transaction.findFirst({
      where: isUuidLike(transactionIdOrRef)
        ? {
            OR: [
              { id: transactionIdOrRef },
              { referenceCode: transactionIdOrRef },
            ],
          }
        : { referenceCode: transactionIdOrRef },
      include: {
        service: { include: { requirements: true } },
        fields: true,
        documents: {
          include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
        steps: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!tx) {
      throw new NotFoundException(
        `Transaction not found: ${transactionIdOrRef}`,
      );
    }
    if (!user.isAdmin && tx.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have access to this transaction for Copilot',
      );
    }

    const readiness = this.readiness.calculate({
      requirements: tx.service.requirements.map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type,
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

    let documents = tx.documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      documentType: d.documentType,
      status: d.status,
      analysisSummary: d.analyses[0]?.summary ?? null,
    }));

    if (documentId) {
      documents = documents.filter((d) => d.id === documentId);
    }

    const quote = quoteSandboxFees(tx.service.metadata);
    const payment = tx.payments[0];
    const missingFields = readiness.evaluations.filter(
      (e) => e.type === 'FIELD' && e.status === 'MISSING',
    ).length;
    const missingDocuments = readiness.evaluations.filter(
      (e) => e.type === 'DOCUMENT' && e.status === 'MISSING',
    ).length;
    const warningDocuments = documents.filter(
      (d) => d.status === 'WARNING',
    ).length;
    const invalidDocuments = documents.filter(
      (d) => d.status === 'INVALID' || d.status === 'EXPIRED',
    ).length;
    const unanalyzedDocuments = documents.filter(
      (d) => !d.analysisSummary || d.status === 'UPLOADED',
    ).length;
    const preparedStep = tx.steps.find(
      (s) => s.code === 'APPLICATION_PREPARED',
    );
    const nextAction = calculateNextAction({
      readinessScore: readiness.score,
      readinessStatus: readiness.status,
      missingDocuments,
      warningDocuments,
      invalidDocuments,
      unanalyzedDocuments,
      missingFields,
      hasPreparedStep:
        preparedStep?.status === 'COMPLETED' ||
        preparedStep?.status === 'IN_PROGRESS',
      blocked: readiness.status === 'BLOCKED',
    });

    const focus = {
      readiness: queryClass === 'READINESS_QUERY',
      missing: queryClass === 'MISSING_REQUIREMENTS_QUERY',
      documents: queryClass === 'DOCUMENT_QUERY',
      payment: queryClass === 'PAYMENT_QUERY',
      status: queryClass === 'STATUS_QUERY' || queryClass === 'NEXT_STEP_QUERY',
    };

    return {
      referenceCode: tx.referenceCode,
      title: tx.title,
      status: tx.status,
      service: { code: tx.service.code, nameEn: tx.service.nameEn },
      readiness: {
        score: readiness.score,
        status: readiness.status,
        breakdown: readiness.breakdown,
        issues: readiness.issues,
        missingRequirements: readiness.missingRequirements,
      },
      fields: tx.fields.map((f) => ({
        code: f.code,
        labelEn: f.labelEn,
        value: f.value,
        source: f.source,
      })),
      documents,
      payment: {
        statusLabel: mapPaymentStatusLabel(
          payment?.status,
          quote.totalAmount > 0,
        ),
        totalAmount: quote.totalAmount,
        required: quote.totalAmount > 0,
      },
      submissionReference: tx.submissionReference,
      submittedAt: tx.submittedAt?.toISOString() ?? null,
      reviewConfirmedAt: tx.reviewConfirmedAt?.toISOString() ?? null,
      nextAction,
      timelineSteps: tx.steps.map((s) => ({
        code: s.code,
        labelEn: s.labelEn,
        status: s.status,
      })),
      focus,
    };
  }
}
