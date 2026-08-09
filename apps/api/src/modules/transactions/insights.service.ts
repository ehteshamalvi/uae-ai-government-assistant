import { Injectable } from '@nestjs/common';
import { InsightType, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface InsightDraft {
  type: InsightType;
  title: string;
  summary: string;
  severity?: string;
  evidence?: Prisma.InputJsonValue;
}

/**
 * Stores user-facing recommendations without claiming OpenAI generation.
 * Dedupes by (transactionId, type, title).
 */
@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertInsights(transactionId: string, drafts: InsightDraft[]) {
    const existing = await this.prisma.aIInsight.findMany({
      where: { transactionId },
      select: { id: true, type: true, title: true },
    });
    const keys = new Set(existing.map((e) => `${e.type}::${e.title}`));

    const created = [];
    for (const draft of drafts) {
      const key = `${draft.type}::${draft.title}`;
      if (keys.has(key)) continue;
      const row = await this.prisma.aIInsight.create({
        data: {
          transactionId,
          type: draft.type,
          title: draft.title,
          summary: draft.summary,
          severity: draft.severity ?? null,
          evidence: draft.evidence,
        },
      });
      created.push(row);
      keys.add(key);
    }
    return created;
  }

  buildFromPreparation(input: {
    readinessScore: number;
    warningDocs: Array<{
      documentType: string | null;
      summary?: string | null;
    }>;
    missingCount: number;
    tenancyExpiringSoon?: boolean;
  }): InsightDraft[] {
    const drafts: InsightDraft[] = [];

    if (input.tenancyExpiringSoon) {
      drafts.push({
        type: InsightType.MONITORING,
        title: 'Tenancy contract expiry',
        summary: 'Your tenancy contract expires in 14 days.',
        severity: 'warning',
      });
    }

    for (const doc of input.warningDocs) {
      if (doc.documentType === 'EMIRATES_ID') {
        drafts.push({
          type: InsightType.DOCUMENT,
          title: 'Emirates ID image quality',
          summary:
            'Your Emirates ID image may need to be re-uploaded (demo AI check).',
          severity: 'warning',
        });
      } else {
        drafts.push({
          type: InsightType.DOCUMENT,
          title: `Document attention: ${doc.documentType ?? 'Unknown'}`,
          summary:
            doc.summary ??
            'A document has a demo validation warning and may need review.',
          severity: 'warning',
        });
      }
    }

    if (input.missingCount === 0 && input.warningDocs.length === 0) {
      drafts.push({
        type: InsightType.READINESS,
        title: 'Documents available',
        summary: 'All required documents are available.',
        severity: 'info',
      });
    } else if (input.missingCount > 0) {
      drafts.push({
        type: InsightType.RECOMMENDATION,
        title: 'Requirement needs attention',
        summary: 'One requirement still needs attention.',
        severity: 'warning',
      });
    }

    drafts.push({
      type: InsightType.READINESS,
      title: 'Readiness snapshot',
      summary: `Current readiness score is ${input.readinessScore}%.`,
      severity: input.readinessScore >= 90 ? 'info' : 'warning',
    });

    return drafts;
  }
}
