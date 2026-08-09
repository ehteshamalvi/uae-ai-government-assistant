import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../../common/decorators/auth.decorators';
import { LocalDocumentStorageProvider } from './storage/local-document-storage.provider';
import {
  DOCUMENT_ANALYSIS_PROVIDER,
  type DocumentAnalysisProvider,
} from '../../providers/ai/ai.interfaces';
import { Inject } from '@nestjs/common';
import { isUuidLike } from '../../common/utils/is-uuid';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalDocumentStorageProvider,
    @Inject(DOCUMENT_ANALYSIS_PROVIDER)
    private readonly analyzer: DocumentAnalysisProvider,
  ) {}

  async list(user: RequestUser, transactionId?: string) {
    const where: {
      userId?: string;
      transactionId?: string;
    } = {};
    if (!user.isAdmin) where.userId = user.id;
    if (transactionId) {
      const tx = await this.resolveTransactionAccess(user, transactionId);
      where.transactionId = tx.id;
    }

    const docs = await this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return docs.map((d) => this.toDto(d));
  }

  async getById(user: RequestUser, id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!doc) throw new NotFoundException(`Document not found: ${id}`);
    this.assertDocumentAccess(user, doc.userId);
    return this.toDto(doc);
  }

  async upload(
    user: RequestUser,
    input: {
      transactionId: string;
      documentType?: string;
      file: Express.Multer.File;
    },
  ) {
    if (!input.file) {
      throw new BadRequestException('file is required');
    }

    const allowed = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
    if (!allowed.has(input.file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }
    if (input.file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File exceeds 10MB limit');
    }

    const tx = await this.resolveTransactionAccess(user, input.transactionId);
    const stored = await this.storage.save({
      transactionId: tx.id,
      originalName: input.file.originalname,
      mimeType: input.file.mimetype,
      buffer: input.file.buffer,
    });

    const analysis = await this.analyzer.analyze({
      fileName: input.file.originalname,
      mimeType: input.file.mimetype,
      documentTypeHint: input.documentType,
    });

    const status: DocumentStatus = analysis.issues.some(
      (i) => i.severity === 'error',
    )
      ? DocumentStatus.INVALID
      : analysis.issues.some((i) => i.severity === 'warning')
        ? DocumentStatus.WARNING
        : DocumentStatus.VALID;

    const doc = await this.prisma.document.create({
      data: {
        userId: user.id,
        transactionId: tx.id,
        fileName: input.file.originalname,
        mimeType: input.file.mimetype,
        storageKey: stored.storageKey,
        sizeBytes: stored.sizeBytes,
        documentType: analysis.classifiedType ?? input.documentType ?? null,
        status,
        checksum: this.storage.checksum(input.file.buffer),
        analyses: {
          create: {
            status: analysis.status,
            provider: analysis.provider,
            classifiedType: analysis.classifiedType,
            extractedMeta: {
              documentType: analysis.documentType,
              confidence: analysis.confidence,
              fields: analysis.fields,
              checks: analysis.checks,
            } as unknown as Prisma.InputJsonValue,
            validationScore: analysis.validationScore,
            qualityScore: analysis.qualityScore,
            issues: analysis.issues,
            summary: analysis.summary,
          },
        },
      },
      include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'DOCUMENT_UPLOADED',
        entityType: 'Document',
        entityId: doc.id,
        metadata: {
          transactionId: tx.id,
          documentType: doc.documentType,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
        },
      },
    });

    return this.toDto(doc);
  }

  async remove(user: RequestUser, id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException(`Document not found: ${id}`);
    this.assertDocumentAccess(user, doc.userId);

    await this.storage.delete(doc.storageKey);
    await this.prisma.document.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async resolveTransactionAccess(user: RequestUser, idOrRef: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: isUuidLike(idOrRef)
        ? { OR: [{ id: idOrRef }, { referenceCode: idOrRef }] }
        : { referenceCode: idOrRef },
    });
    if (!tx) throw new NotFoundException(`Transaction not found: ${idOrRef}`);
    if (!user.isAdmin && tx.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }
    return tx;
  }

  private assertDocumentAccess(user: RequestUser, ownerId: string) {
    if (!user.isAdmin && user.id !== ownerId) {
      throw new ForbiddenException('You do not have access to this document');
    }
  }

  private toDto(doc: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    documentType: string | null;
    status: string;
    expiryDate: Date | null;
    createdAt: Date;
    transactionId: string | null;
    analyses?: Array<{
      status: string;
      summary: string | null;
      validationScore: number | null;
      qualityScore: number | null;
      issues: unknown;
      provider: string;
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
      transactionId: doc.transactionId,
      analysis: latest
        ? {
            provider: latest.provider,
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
