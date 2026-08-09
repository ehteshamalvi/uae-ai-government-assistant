import type { KnowledgeChunk } from '../knowledge/knowledge.types';
import type { CopilotQueryClass } from './copilot-query.classifier';
import type { CopilotTransactionContext } from './copilot-context.builder';

export interface CopilotSource {
  type: string;
  title: string;
  referenceId?: string;
}

export interface CopilotSuggestedAction {
  code: string;
  label: string;
  href?: string;
}

export interface CopilotGenerateInput {
  message: string;
  queryClass: CopilotQueryClass;
  transactionContext: CopilotTransactionContext | null;
  knowledgeChunks: KnowledgeChunk[];
  recentMessages: Array<{ role: string; content: string }>;
}

export interface CopilotGenerateResult {
  answer: string;
  confidence: number;
  confidenceBand: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: CopilotSource[];
  suggestedActions: CopilotSuggestedAction[];
  noKnowledge?: boolean;
}

export interface CopilotAIProvider {
  providerName(): string;
  isEnabled(): boolean;
  generate(input: CopilotGenerateInput): Promise<CopilotGenerateResult>;
}

export const COPILOT_AI_PROVIDER = Symbol('COPILOT_AI_PROVIDER');

export function validateCopilotResult(
  raw: unknown,
  opts?: { maxAnswerLength?: number },
): CopilotGenerateResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid Copilot provider response');
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.answer !== 'string' || !r.answer.trim()) {
    throw new Error('Copilot response missing answer');
  }
  const maxLen = opts?.maxAnswerLength ?? 2000;
  let answer = r.answer.trim();
  if (answer.length > maxLen) {
    answer = `${answer.slice(0, maxLen - 1)}…`;
  }
  return {
    answer,
    confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
    confidenceBand:
      r.confidenceBand === 'HIGH' ||
      r.confidenceBand === 'MEDIUM' ||
      r.confidenceBand === 'LOW'
        ? r.confidenceBand
        : 'MEDIUM',
    sources: Array.isArray(r.sources) ? (r.sources as CopilotSource[]) : [],
    suggestedActions: Array.isArray(r.suggestedActions)
      ? (r.suggestedActions as CopilotSuggestedAction[])
      : [],
    noKnowledge: Boolean(r.noKnowledge),
  };
}

export { actionHref } from './copilot-actions.allowlist';
