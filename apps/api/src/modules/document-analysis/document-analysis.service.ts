import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnalysisStatus, DocumentStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../../common/decorators/auth.decorators';
import {
  DOCUMENT_ANALYSIS_PROVIDER,
  type DocumentAnalysisProvider,
} from '../../providers/ai/ai.interfaces';

@Injectable()
export class DocumentAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_ANALYSIS_PROVIDER)
    private readonly analyzer: DocumentAnalysisProvider,
  ) {}

  getModuleName() {
    return 'document-analysis';
  }

  async analyze(user: RequestUser, documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException(`Document not found: ${documentId}`);
    this.assertAccess(user, doc.userId);

    // Structure supports async later; Phase 3 runs synchronously via mock provider.
    await this.prisma.document.update({
      where: { id: doc.id },
      data: { status: DocumentStatus.ANALYZING },
    });

    const pending = await this.prisma.documentAnalysis.create({
      data: {
        documentId: doc.id,
        status: AnalysisStatus.PROCESSING,
        provider: 'MOCK',
        summary: 'Demo AI analysis in progress…',
      },
    });

    try {
      const result = await this.analyzer.analyze({
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        documentTypeHint: doc.documentType,
      });

      const docStatus: DocumentStatus = result.issues.some(
        (i) => i.severity === 'error',
      )
        ? DocumentStatus.INVALID
        : result.issues.some((i) => i.severity === 'warning')
          ? DocumentStatus.WARNING
          : DocumentStatus.VALID;

      const analysis = await this.prisma.documentAnalysis.update({
        where: { id: pending.id },
        data: {
          status:
            result.status === 'FAILED'
              ? AnalysisStatus.FAILED
              : result.status === 'MOCK'
                ? AnalysisStatus.MOCK
                : AnalysisStatus.COMPLETED,
          provider: result.provider,
          classifiedType: result.classifiedType,
          extractedMeta: {
            documentType: result.documentType,
            confidence: result.confidence,
            fields: result.fields,
            checks: result.checks,
          } as unknown as Prisma.InputJsonValue,
          validationScore: result.validationScore,
          qualityScore: result.qualityScore,
          issues: result.issues,
          summary: result.summary,
        },
      });

      await this.prisma.document.update({
        where: { id: doc.id },
        data: {
          status: docStatus,
          documentType: result.classifiedType ?? doc.documentType,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'DOCUMENT_ANALYZED',
          entityType: 'Document',
          entityId: doc.id,
          metadata: {
            analysisId: analysis.id,
            classifiedType: result.classifiedType,
            provider: result.provider,
          },
        },
      });

      await this.prisma.aIAction.create({
        data: {
          transactionId: doc.transactionId,
          userId: user.id,
          type: 'DOCUMENT_ANALYSIS',
          agentName: 'MockDocumentAnalysisProvider',
          inputSummary: doc.fileName,
          outputSummary: result.summary,
          success: true,
        },
      });

      return this.toAnalysisDto(analysis, doc.id);
    } catch (error) {
      await this.prisma.documentAnalysis.update({
        where: { id: pending.id },
        data: {
          status: AnalysisStatus.FAILED,
          summary: 'Demo AI analysis failed.',
        },
      });
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { status: DocumentStatus.INVALID },
      });
      throw error;
    }
  }

  async getAnalysis(user: RequestUser, documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        analyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!doc) throw new NotFoundException(`Document not found: ${documentId}`);
    this.assertAccess(user, doc.userId);

    const latest = doc.analyses[0];
    if (!latest) {
      return {
        documentId: doc.id,
        status: 'PENDING' as const,
        analysis: null,
      };
    }

    return {
      documentId: doc.id,
      status: latest.status,
      analysis: this.toAnalysisDto(latest, doc.id),
    };
  }

  private assertAccess(user: RequestUser, ownerId: string) {
    if (!user.isAdmin && user.id !== ownerId) {
      throw new ForbiddenException('You do not have access to this document');
    }
  }

  private toAnalysisDto(
    analysis: {
      id: string;
      status: string;
      provider: string;
      classifiedType: string | null;
      extractedMeta: unknown;
      validationScore: number | null;
      qualityScore: number | null;
      issues: unknown;
      summary: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    documentId: string,
  ) {
    const meta =
      analysis.extractedMeta && typeof analysis.extractedMeta === 'object'
        ? (analysis.extractedMeta as Record<string, unknown>)
        : {};

    return {
      id: analysis.id,
      documentId,
      status: analysis.status,
      provider: analysis.provider,
      documentType: (meta.documentType as string) ?? analysis.classifiedType,
      classifiedType: analysis.classifiedType,
      confidence: (meta.confidence as number) ?? null,
      fields: (meta.fields as Record<string, string | null>) ?? {},
      checks: meta.checks ?? null,
      validationScore: analysis.validationScore,
      qualityScore: analysis.qualityScore,
      issues: analysis.issues,
      summary: analysis.summary,
      terminology: 'Demo Validation / AI Check',
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }
}
