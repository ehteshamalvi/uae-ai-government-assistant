import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { IntentResult } from '../../providers/ai/ai.interfaces';
import {
  classifyIntentConfidence,
  type IntentConfidenceBand,
} from '../../common/constants/ai.constants';

export interface IdentifiedService {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  category: string;
  description: string;
  confidence: number;
}

export interface ServiceIdentificationResult {
  primary: IdentifiedService | null;
  alternatives: IdentifiedService[];
  confidenceBand: IntentConfidenceBand;
  matchedFromCatalog: boolean;
}

/**
 * Resolves AI/provider service candidates against the real Service catalog.
 * Never invents services that do not exist in the database.
 */
@Injectable()
export class ServiceIdentificationService {
  constructor(private readonly prisma: PrismaService) {}

  async identify(intent: IntentResult): Promise<ServiceIdentificationResult> {
    const catalog = await this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { nameEn: 'asc' },
    });

    const byCode = new Map(catalog.map((s) => [s.code, s]));
    const resolved: IdentifiedService[] = [];

    for (const candidate of intent.candidates) {
      const service = byCode.get(candidate.serviceCode);
      if (!service) continue;
      resolved.push({
        id: service.id,
        code: service.code,
        nameEn: service.nameEn,
        nameAr: service.nameAr,
        category: service.category,
        description: service.description,
        confidence: candidate.confidence,
      });
    }

    // Fallback: match candidate name hint against catalog names
    if (resolved.length === 0 && intent.serviceCandidate) {
      const hint = intent.serviceCandidate.toLowerCase();
      const fuzzy = catalog.find(
        (s) =>
          s.nameEn.toLowerCase().includes(hint) ||
          hint.includes(s.nameEn.toLowerCase()) ||
          s.code.toLowerCase().includes(hint.replace(/\s+/g, '_')),
      );
      if (fuzzy) {
        resolved.push({
          id: fuzzy.id,
          code: fuzzy.code,
          nameEn: fuzzy.nameEn,
          nameAr: fuzzy.nameAr,
          category: fuzzy.category,
          description: fuzzy.description,
          confidence: intent.confidence,
        });
      }
    }

    resolved.sort((a, b) => b.confidence - a.confidence);
    const primary = resolved[0] ?? null;
    const band = classifyIntentConfidence(
      primary?.confidence ?? intent.confidence,
    );

    return {
      primary,
      alternatives: resolved.slice(1),
      confidenceBand: band,
      matchedFromCatalog: Boolean(primary),
    };
  }
}
