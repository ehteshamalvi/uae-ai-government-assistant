import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  INTENT_PROVIDER,
  type IntentProvider,
} from '../../providers/ai/ai.interfaces';
import { ServiceIdentificationService } from './service-identification.service';
import { classifyIntentConfidence } from '../../common/constants/ai.constants';
import type { AnalyzeIntentDto } from './dto/analyze-intent.dto';

@Injectable()
export class IntentService {
  constructor(
    @Inject(INTENT_PROVIDER) private readonly intentProvider: IntentProvider,
    private readonly serviceIdentification: ServiceIdentificationService,
    private readonly prisma: PrismaService,
  ) {}

  getModuleName() {
    return 'intent';
  }

  async analyze(dto: AnalyzeIntentDto) {
    const message = dto.message?.trim() ?? '';
    if (!message) {
      throw new BadRequestException('message is required');
    }
    if (message.length > 2000) {
      throw new BadRequestException('message must be at most 2000 characters');
    }

    const started = Date.now();
    const intent = await this.intentProvider.analyze(message);
    const identification = await this.serviceIdentification.identify(intent);
    const confidence = identification.primary?.confidence ?? intent.confidence;
    const band = classifyIntentConfidence(confidence);

    const suggestedNextAction =
      !identification.primary || band === 'LOW'
        ? 'CHOOSE_SERVICE'
        : band === 'MEDIUM'
          ? 'CONFIRM_SERVICE'
          : 'START_TRANSACTION';

    await this.prisma.aIAction.create({
      data: {
        type: 'INTENT_ANALYSIS',
        agentName: 'MockIntentProvider',
        inputSummary: message.slice(0, 240),
        outputSummary: identification.primary
          ? `${identification.primary.code} (${band})`
          : 'NO_MATCH',
        success: true,
        latencyMs: Date.now() - started,
      },
    });

    return {
      intent: intent.intent,
      interpretedRequest: intent.interpretedRequest,
      serviceCandidate: identification.primary
        ? {
            id: identification.primary.id,
            code: identification.primary.code,
            nameEn: identification.primary.nameEn,
            nameAr: identification.primary.nameAr,
            category: identification.primary.category,
            description: identification.primary.description,
          }
        : null,
      serviceCandidateName:
        identification.primary?.nameEn ?? intent.serviceCandidate,
      confidence,
      confidenceBand: band,
      entities: intent.entities,
      alternatives: identification.alternatives.map((a) => ({
        id: a.id,
        code: a.code,
        nameEn: a.nameEn,
        nameAr: a.nameAr,
        category: a.category,
        confidence: a.confidence,
        confidenceBand: classifyIntentConfidence(a.confidence),
      })),
      suggestedNextAction,
      provider: intent.provider,
      note: intent.note,
    };
  }
}
