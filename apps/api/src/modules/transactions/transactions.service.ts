import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FieldSource,
  Prisma,
  StepStatus,
  TransactionStatus,
  type Prisma as PrismaNS,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../../common/decorators/auth.decorators';
import type { ListTransactionsQueryDto } from './dto/list-transactions.query.dto';
import { ReadinessService } from './readiness/readiness.service';
import { isUuidLike } from '../../common/utils/is-uuid';
import type {
  CreateTransactionDto,
  UpdateTransactionFieldsDto,
} from './dto/create-transaction.dto';
import {
  DEFAULT_TRANSACTION_STEPS,
  deriveFieldStatus,
  generateTransactionReference,
} from './transaction.helpers';
import { calculateNextAction } from './next-action.service';
import { InsightsService } from './insights.service';
import { DocumentAnalysisService } from '../document-analysis/document-analysis.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readinessService: ReadinessService,
    private readonly insightsService: InsightsService,
    private readonly documentAnalysis: DocumentAnalysisService,
  ) {}

  async list(user: RequestUser, query: ListTransactionsQueryDto) {
    const where: Prisma.TransactionWhereInput = {};
    if (!user.isAdmin) where.userId = user.id;
    if (query.status) where.status = query.status;
    if (query.serviceId) where.serviceId = query.serviceId;
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { referenceCode: { contains: term, mode: 'insensitive' } },
        { intentText: { contains: term, mode: 'insensitive' } },
      ];
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        service: { include: { requirements: true } },
        fields: true,
        documents: true,
        _count: { select: { documents: true, fields: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return transactions.map((tx) => {
      const readiness = this.readinessService.calculate({
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

      return {
        id: tx.id,
        referenceCode: tx.referenceCode,
        title: tx.title,
        status: tx.status,
        readinessScore: readiness.score,
        readinessStatus: readiness.status,
        sandbox: tx.sandbox,
        confidence: tx.confidence,
        service: {
          id: tx.service.id,
          code: tx.service.code,
          nameEn: tx.service.nameEn,
          nameAr: tx.service.nameAr,
          category: tx.service.category,
        },
        documentCount: tx._count.documents,
        fieldCount: tx._count.fields,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        submittedAt: tx.submittedAt,
      };
    });
  }

  async getById(user: RequestUser, idOrRef: string) {
    const base = await this.findAuthorized(user, idOrRef);
    const full = await this.prisma.transaction.findUniqueOrThrow({
      where: { id: base.id },
      include: {
        service: true,
        fields: { orderBy: { code: 'asc' } },
        steps: { orderBy: { sortOrder: 'asc' } },
        documents: {
          include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
          orderBy: { createdAt: 'asc' },
        },
        insights: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    const readiness = await this.computeReadiness(full.id, false);

    return {
      id: full.id,
      referenceCode: full.referenceCode,
      title: full.title,
      status: full.status,
      intentText: full.intentText,
      confidence: full.confidence,
      sandbox: full.sandbox,
      readinessScore: readiness.score,
      readinessStatus: readiness.status,
      service: {
        id: full.service.id,
        code: full.service.code,
        nameEn: full.service.nameEn,
        nameAr: full.service.nameAr,
        category: full.service.category,
        description: full.service.description,
      },
      fields: full.fields.map((f) => ({
        id: f.id,
        code: f.code,
        labelEn: f.labelEn,
        labelAr: f.labelAr,
        value: f.value,
        dataType: f.dataType,
        source: f.source,
        isVerified: f.isVerified,
        confidence: f.confidence,
      })),
      steps: full.steps.map((s) => this.mapStep(s)),
      documents: full.documents.map((d) => this.mapDocument(d)),
      insights: full.insights.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        summary: i.summary,
        severity: i.severity,
        createdAt: i.createdAt,
      })),
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
      submittedAt: full.submittedAt,
    };
  }

  async getSteps(user: RequestUser, idOrRef: string) {
    const tx = await this.findAuthorized(user, idOrRef);
    const steps = await this.prisma.transactionStep.findMany({
      where: { transactionId: tx.id },
      orderBy: { sortOrder: 'asc' },
    });
    return steps.map((s) => this.mapStep(s));
  }

  async getFields(user: RequestUser, idOrRef: string) {
    const tx = await this.findAuthorized(user, idOrRef);
    const fields = await this.prisma.transactionField.findMany({
      where: { transactionId: tx.id },
      orderBy: { code: 'asc' },
    });
    return fields.map((f) => ({
      id: f.id,
      code: f.code,
      labelEn: f.labelEn,
      labelAr: f.labelAr,
      value: f.value,
      dataType: f.dataType,
      source: f.source,
      isVerified: f.isVerified,
      confidence: f.confidence,
    }));
  }

  async getDocuments(user: RequestUser, idOrRef: string) {
    const tx = await this.findAuthorized(user, idOrRef);
    const documents = await this.prisma.document.findMany({
      where: { transactionId: tx.id },
      include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    });
    return documents.map((d) => this.mapDocument(d));
  }

  async getReadiness(user: RequestUser, idOrRef: string) {
    const tx = await this.findAuthorized(user, idOrRef);
    return this.computeReadiness(tx.id, true);
  }

  async create(user: RequestUser, dto: CreateTransactionDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, isActive: true },
      include: { requirements: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!service) {
      throw new BadRequestException('Service not found or inactive');
    }

    let referenceCode = generateTransactionReference();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await this.prisma.transaction.findUnique({
        where: { referenceCode },
      });
      if (!clash) break;
      referenceCode = generateTransactionReference();
    }

    const fieldReqs = service.requirements.filter((r) => r.type === 'FIELD');
    const now = new Date();

    const tx = await this.prisma.transaction.create({
      data: {
        referenceCode,
        userId: user.id,
        serviceId: service.id,
        status: TransactionStatus.IDENTIFIED,
        title: service.nameEn,
        intentText: dto.intentText ?? null,
        confidence: dto.confidence ?? null,
        sandbox: true,
        fields: {
          create: fieldReqs.map((r) => ({
            code: r.code,
            labelEn: r.labelEn,
            labelAr: r.labelAr,
            dataType: r.dataType ?? 'STRING',
            value: null,
            source: FieldSource.USER_PROVIDED,
          })),
        },
        steps: {
          create: DEFAULT_TRANSACTION_STEPS.map((step, index) => ({
            code: step.code,
            labelEn: step.labelEn,
            labelAr: step.labelAr,
            sortOrder: step.sortOrder,
            status: index === 0 ? StepStatus.COMPLETED : StepStatus.PENDING,
            completedAt: index === 0 ? now : null,
            startedAt: index === 0 ? now : null,
          })),
        },
      },
      include: { service: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'TRANSACTION_CREATED',
        entityType: 'Transaction',
        entityId: tx.id,
        metadata: {
          referenceCode: tx.referenceCode,
          serviceId: service.id,
          serviceCode: service.code,
        },
      },
    });

    await this.prisma.aIAction.create({
      data: {
        transactionId: tx.id,
        userId: user.id,
        type: 'SERVICE_IDENTIFICATION',
        agentName: 'ServiceIdentification',
        inputSummary: dto.intentText ?? service.code,
        outputSummary: service.code,
        success: true,
      },
    });

    return {
      id: tx.id,
      referenceCode: tx.referenceCode,
      title: tx.title,
      status: tx.status,
      service: {
        id: service.id,
        code: service.code,
        nameEn: service.nameEn,
        nameAr: service.nameAr,
      },
      intentText: tx.intentText,
      confidence: tx.confidence,
      createdAt: tx.createdAt,
    };
  }

  async prepare(user: RequestUser, idOrRef: string) {
    const base = await this.findAuthorized(user, idOrRef);
    const tx = await this.prisma.transaction.findUniqueOrThrow({
      where: { id: base.id },
      include: {
        service: {
          include: { requirements: { orderBy: { sortOrder: 'asc' } } },
        },
        fields: true,
        documents: {
          include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
        steps: true,
      },
    });

    // Ensure field rows exist for every FIELD requirement (idempotent upsert)
    for (const req of tx.service.requirements.filter(
      (r) => r.type === 'FIELD',
    )) {
      const existing = tx.fields.find((f) => f.code === req.code);
      if (!existing) {
        await this.prisma.transactionField.create({
          data: {
            transactionId: tx.id,
            code: req.code,
            labelEn: req.labelEn,
            labelAr: req.labelAr,
            dataType: req.dataType ?? 'STRING',
            value: null,
            source: FieldSource.USER_PROVIDED,
          },
        });
      }
    }

    // Ensure default steps exist (idempotent)
    for (const step of DEFAULT_TRANSACTION_STEPS) {
      const existing = tx.steps.find((s) => s.code === step.code);
      if (!existing) {
        await this.prisma.transactionStep.create({
          data: {
            transactionId: tx.id,
            code: step.code,
            labelEn: step.labelEn,
            labelAr: step.labelAr,
            sortOrder: step.sortOrder,
            status: StepStatus.PENDING,
          },
        });
      }
    }

    // Mock document analysis where documents lack analysis
    const docsNeedingAnalysis = tx.documents.filter(
      (d) =>
        !d.analyses.length ||
        d.status === 'UPLOADED' ||
        d.status === 'ANALYZING',
    );
    for (const doc of docsNeedingAnalysis) {
      await this.documentAnalysis.analyze(user, doc.id);
    }

    const readiness = await this.computeReadiness(tx.id, true);

    const refreshed = await this.prisma.transaction.findUniqueOrThrow({
      where: { id: tx.id },
      include: {
        documents: {
          include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
        fields: true,
        steps: true,
        service: { include: { requirements: true } },
      },
    });

    const now = new Date();
    await this.prisma.transactionStep.updateMany({
      where: {
        transactionId: tx.id,
        code: {
          in: [
            'SERVICE_IDENTIFIED',
            'REQUIREMENTS_CHECKED',
            'DOCUMENTS_VALIDATED',
          ],
        },
      },
      data: {
        status: StepStatus.COMPLETED,
        completedAt: now,
      },
    });

    const preparedDone =
      readiness.score >= 90 &&
      readiness.missingRequirements.filter((m) => m.status === 'MISSING')
        .length === 0;

    await this.prisma.transactionStep.upsert({
      where: {
        transactionId_code: {
          transactionId: tx.id,
          code: 'APPLICATION_PREPARED',
        },
      },
      create: {
        transactionId: tx.id,
        code: 'APPLICATION_PREPARED',
        labelEn: 'Application Prepared',
        labelAr: 'تم إعداد الطلب',
        sortOrder: 4,
        status: preparedDone ? StepStatus.COMPLETED : StepStatus.IN_PROGRESS,
        startedAt: now,
        completedAt: preparedDone ? now : null,
      },
      update: {
        status: preparedDone ? StepStatus.COMPLETED : StepStatus.IN_PROGRESS,
        startedAt: now,
        completedAt: preparedDone ? now : null,
      },
    });

    await this.prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: preparedDone
          ? TransactionStatus.READY_FOR_REVIEW
          : TransactionStatus.PREPARING,
      },
    });

    const warningDocs = refreshed.documents.filter(
      (d) => d.status === 'WARNING',
    );
    const tenancy = refreshed.documents.find(
      (d) => d.documentType === 'TENANCY_CONTRACT',
    );

    await this.insightsService.upsertInsights(
      tx.id,
      this.insightsService.buildFromPreparation({
        readinessScore: readiness.score,
        warningDocs: warningDocs.map((d) => ({
          documentType: d.documentType,
          summary: d.analyses[0]?.summary,
        })),
        missingCount: readiness.missingRequirements.filter(
          (m) => m.status === 'MISSING',
        ).length,
        tenancyExpiringSoon: Boolean(tenancy),
      }),
    );

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'APPLICATION_PREPARED',
        entityType: 'Transaction',
        entityId: tx.id,
        metadata: {
          readinessScore: readiness.score,
          readinessStatus: readiness.status,
        },
      },
    });

    await this.prisma.aIAction.create({
      data: {
        transactionId: tx.id,
        userId: user.id,
        type: 'PREPARATION',
        agentName: 'PreparationService',
        inputSummary: tx.referenceCode,
        outputSummary: `readiness=${readiness.score}`,
        success: true,
      },
    });

    const workspace = await this.getWorkspace(user, tx.id);

    return {
      transactionId: tx.id,
      referenceCode: tx.referenceCode,
      readiness,
      analyzedDocuments: docsNeedingAnalysis.length,
      nextAction: workspace.nextAction,
      summary: {
        missingRequirements: readiness.missingRequirements,
        issues: readiness.issues,
        recommendations: readiness.recommendations,
      },
    };
  }

  async getWorkspace(user: RequestUser, idOrRef: string) {
    const detail = await this.getById(user, idOrRef);
    const readiness = await this.computeReadiness(detail.id, false);

    const fieldReqs = readiness.evaluations.filter((e) => e.type === 'FIELD');
    const docReqs = readiness.evaluations.filter((e) => e.type === 'DOCUMENT');

    const missingFields = fieldReqs.filter(
      (e) => e.status === 'MISSING',
    ).length;
    const missingDocuments = docReqs.filter(
      (e) => e.status === 'MISSING',
    ).length;
    const warningDocuments = detail.documents.filter(
      (d) => d.status === 'WARNING',
    ).length;
    const invalidDocuments = detail.documents.filter(
      (d) => d.status === 'INVALID' || d.status === 'EXPIRED',
    ).length;
    const unanalyzedDocuments = detail.documents.filter(
      (d) => !d.analysis || d.status === 'UPLOADED',
    ).length;

    const preparedStep = detail.steps.find(
      (s) => s.code === 'APPLICATION_PREPARED',
    );
    const hasPreparedStep =
      preparedStep?.status === 'COMPLETED' ||
      preparedStep?.status === 'IN_PROGRESS';

    const nextAction = calculateNextAction({
      readinessScore: readiness.score,
      readinessStatus: readiness.status,
      missingDocuments,
      warningDocuments,
      invalidDocuments,
      unanalyzedDocuments,
      missingFields,
      hasPreparedStep,
      blocked: readiness.status === 'BLOCKED',
    });

    const fields = detail.fields.map((f) => ({
      ...f,
      status: deriveFieldStatus({
        value: f.value,
        source: f.source,
        isVerified: f.isVerified,
        confidence: f.confidence,
      }),
      sourceLabel: this.sourceLabel(f.source),
    }));

    const enabledActions = {
      reviewReadiness: true,
      uploadDocument: missingDocuments > 0 || true,
      analyzeDocument: unanalyzedDocuments > 0 || detail.documents.length > 0,
      completeInformation: missingFields > 0,
      prepareApplication: true,
      reviewApplication: readiness.score >= 70 && missingDocuments === 0,
      submit: false,
      payment: false,
    };

    return {
      ...detail,
      fields,
      readiness,
      requiredInformation: fieldReqs,
      requiredDocuments: docReqs,
      completedRequirements: readiness.evaluations.filter(
        (e) => e.status === 'COMPLETE',
      ),
      warnings: readiness.issues.filter((i) => i.severity === 'warning'),
      missingRequirements: readiness.missingRequirements,
      nextAction,
      enabledActions,
    };
  }

  async updateFields(
    user: RequestUser,
    idOrRef: string,
    dto: UpdateTransactionFieldsDto,
  ) {
    const tx = await this.findAuthorized(user, idOrRef);
    const service = await this.prisma.service.findUniqueOrThrow({
      where: { id: tx.serviceId },
      include: { requirements: true },
    });

    const allowedCodes = new Set(
      service.requirements.filter((r) => r.type === 'FIELD').map((r) => r.code),
    );

    const updated = [];
    for (const item of dto.fields) {
      if (!allowedCodes.has(item.code)) {
        throw new BadRequestException(
          `Field code not allowed for this service: ${item.code}`,
        );
      }
      const req = service.requirements.find((r) => r.code === item.code)!;
      const row = await this.prisma.transactionField.upsert({
        where: {
          transactionId_code: { transactionId: tx.id, code: item.code },
        },
        create: {
          transactionId: tx.id,
          code: item.code,
          labelEn: req.labelEn,
          labelAr: req.labelAr,
          dataType: req.dataType ?? 'STRING',
          value: item.value,
          source: item.source ?? FieldSource.USER_PROVIDED,
        },
        update: {
          value: item.value,
          source: item.source ?? FieldSource.USER_PROVIDED,
        },
      });
      updated.push({
        code: row.code,
        value: row.value,
        source: row.source,
        status: deriveFieldStatus(row),
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'TRANSACTION_UPDATED',
        entityType: 'Transaction',
        entityId: tx.id,
        metadata: { fields: updated.map((u) => u.code) },
      },
    });

    const readiness = await this.computeReadiness(tx.id, true);
    return { fields: updated, readiness };
  }

  private sourceLabel(source: string): string {
    switch (source) {
      case 'AI_EXTRACTED':
        return 'AI Extracted';
      case 'SYSTEM_VERIFIED':
        return 'System Verified';
      default:
        return 'User Provided';
    }
  }

  private async computeReadiness(transactionId: string, persist: boolean) {
    const tx = await this.prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: {
        fields: true,
        documents: true,
        service: { include: { requirements: true } },
      },
    });

    const result = this.readinessService.calculate({
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

    if (persist) {
      const breakdown = {
        score: result.score,
        status: result.status,
        factors: result.breakdown,
        issues: result.issues,
        missingRequirements: result.missingRequirements,
        recommendations: result.recommendations,
        weights: result.weights,
      } as unknown as PrismaNS.InputJsonValue;

      await this.prisma.transaction.update({
        where: { id: tx.id },
        data: {
          readinessScore: result.score,
          readinessBreakdown: breakdown,
        },
      });
    }

    return {
      transactionId: tx.id,
      referenceCode: tx.referenceCode,
      score: result.score,
      status: result.status,
      breakdown: result.breakdown,
      issues: result.issues,
      missingRequirements: result.missingRequirements,
      recommendations: result.recommendations,
      evaluations: result.evaluations,
      weights: result.weights,
    };
  }

  private async findAuthorized(user: RequestUser, idOrRef: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: isUuidLike(idOrRef)
        ? { OR: [{ id: idOrRef }, { referenceCode: idOrRef }] }
        : { referenceCode: idOrRef },
    });

    if (!tx) {
      throw new NotFoundException(`Transaction not found: ${idOrRef}`);
    }

    if (!user.isAdmin && tx.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }

    return tx;
  }

  private mapStep(step: {
    id: string;
    code: string;
    labelEn: string;
    labelAr: string;
    status: string;
    sortOrder: number;
    startedAt: Date | null;
    completedAt: Date | null;
  }) {
    return {
      id: step.id,
      code: step.code,
      labelEn: step.labelEn,
      labelAr: step.labelAr,
      status: step.status,
      sortOrder: step.sortOrder,
      startedAt: step.startedAt,
      completedAt: step.completedAt,
    };
  }

  private mapDocument(doc: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    documentType: string | null;
    status: string;
    expiryDate: Date | null;
    createdAt: Date;
    analyses?: Array<{
      status: string;
      summary: string | null;
      validationScore: number | null;
      qualityScore: number | null;
      issues: unknown;
    }>;
  }) {
    const latest = doc.analyses?.[0];
    return {
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      documentType: doc.documentType,
      status: doc.status,
      expiryDate: doc.expiryDate,
      uploadedAt: doc.createdAt,
      analysis: latest
        ? {
            status: latest.status,
            summary: latest.summary,
            validationScore: latest.validationScore,
            qualityScore: latest.qualityScore,
            issues: latest.issues,
          }
        : null,
    };
  }
}
