import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  classifyCopilotQuery,
  needsKnowledgeRetrieval,
} from './copilot-query.classifier';
import { CopilotContextBuilder } from './copilot-context.builder';
import {
  COPILOT_AI_PROVIDER,
  validateCopilotResult,
  type CopilotAIProvider,
} from './copilot-ai.types';
import {
  KNOWLEDGE_RETRIEVER,
  type KnowledgeRetriever,
} from '../knowledge/knowledge.types';
import type { RequestUser } from '../../common/decorators/auth.decorators';
import { filterAllowedActions } from './copilot-actions.allowlist';

/**
 * Simple orchestration boundary (not LangGraph).
 * 1 message → classify → context → knowledge → provider → validate
 */
@Injectable()
export class CopilotOrchestrator {
  private readonly logger = new Logger(CopilotOrchestrator.name);

  constructor(
    private readonly contextBuilder: CopilotContextBuilder,
    private readonly config: ConfigService,
    @Inject(KNOWLEDGE_RETRIEVER)
    private readonly knowledge: KnowledgeRetriever,
    @Inject(COPILOT_AI_PROVIDER)
    private readonly ai: CopilotAIProvider,
  ) {}

  async reply(input: {
    user: RequestUser;
    message: string;
    transactionId?: string | null;
    documentId?: string | null;
    recentMessages: Array<{ role: string; content: string }>;
  }) {
    const maxMessageLength =
      this.config.get<number>('copilot.maxMessageLength') ?? 2000;
    const maxHistory = this.config.get<number>('copilot.maxHistory') ?? 8;
    const maxKnowledgeChunks =
      this.config.get<number>('copilot.maxKnowledgeChunks') ?? 3;
    const maxAnswerLength =
      this.config.get<number>('copilot.maxAnswerLength') ?? 2000;
    const minKnowledgeScore =
      this.config.get<number>('copilot.minKnowledgeScore') ?? 2;

    const message = input.message?.trim();
    if (!message) {
      throw new BadRequestException('message is required');
    }
    if (message.length > maxMessageLength) {
      throw new BadRequestException(
        `message too long (max ${maxMessageLength} characters)`,
      );
    }

    if (!this.ai.isEnabled()) {
      throw new ServiceUnavailableException(
        'AI Copilot provider is unavailable. Configure AI_PROVIDER=mock (default).',
      );
    }

    const queryClass = classifyCopilotQuery(message);
    const transactionContext = await this.contextBuilder.build(
      input.user,
      input.transactionId,
      queryClass,
      input.documentId,
    );

    let knowledgeChunks = [] as Awaited<
      ReturnType<KnowledgeRetriever['search']>
    >;

    const shouldRetrieve =
      needsKnowledgeRetrieval(queryClass) ||
      queryClass === 'NEXT_STEP_QUERY' ||
      queryClass === 'PAYMENT_QUERY' ||
      queryClass === 'STATUS_QUERY';

    if (shouldRetrieve && !transactionContext) {
      knowledgeChunks = await this.knowledge.search(message, {
        limit: maxKnowledgeChunks + 1,
      });
    } else if (shouldRetrieve && transactionContext) {
      // With an active transaction, only retrieve when terms are relevant —
      // do not auto-inject unrelated service knowledge for UNKNOWN queries.
      knowledgeChunks = await this.knowledge.search(message, {
        serviceCode:
          queryClass === 'UNKNOWN'
            ? undefined
            : transactionContext.service.code,
        limit: maxKnowledgeChunks + 1,
      });
    }

    if (
      queryClass === 'NEXT_STEP_QUERY' ||
      queryClass === 'PAYMENT_QUERY' ||
      queryClass === 'STATUS_QUERY'
    ) {
      const extra = await this.knowledge.search(message, {
        category: queryClass === 'PAYMENT_QUERY' ? 'PAYMENT' : 'LIFECYCLE',
        limit: 2,
      });
      const ids = new Set(knowledgeChunks.map((k) => k.documentId));
      for (const e of extra) {
        if (!ids.has(e.documentId)) knowledgeChunks.push(e);
      }
    }

    knowledgeChunks = knowledgeChunks
      .filter((k) => k.score >= minKnowledgeScore)
      .slice(0, maxKnowledgeChunks);

    // Unknown + active txn: refuse low-relevance KB answers
    if (
      queryClass === 'UNKNOWN' &&
      transactionContext &&
      knowledgeChunks.length === 0
    ) {
      this.logger.log(
        JSON.stringify({
          module: 'copilot',
          action: 'UNKNOWN_NO_RELEVANT_KNOWLEDGE',
          transaction: transactionContext.referenceCode,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    const raw = await this.ai.generate({
      message,
      queryClass,
      transactionContext,
      knowledgeChunks,
      recentMessages: input.recentMessages.slice(-maxHistory),
    });

    const validated = validateCopilotResult(raw, { maxAnswerLength });
    return {
      ...validated,
      suggestedActions: filterAllowedActions(validated.suggestedActions),
      queryClass,
      provider: this.ai.providerName(),
    };
  }
}
