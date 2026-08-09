/**
 * Architectural boundary for future LangGraph / OpenAI orchestration.
 * Phase 5 enables Copilot node with Mock provider — no LangGraph runtime.
 */
export type OrchestratorNode =
  | 'intent'
  | 'serviceIdentification'
  | 'requirements'
  | 'documentIntelligence'
  | 'validation'
  | 'preparation'
  | 'finalReview'
  | 'monitoring'
  | 'copilot';

export const PHASE5_ORCHESTRATOR_NODES: OrchestratorNode[] = [
  'intent',
  'serviceIdentification',
  'documentIntelligence',
  'preparation',
  'copilot',
];

export interface OrchestratorBoundary {
  enabled: boolean;
  provider: 'MOCK' | 'OPENAI' | 'LANGGRAPH';
  nodes: OrchestratorNode[];
}

export function getOrchestratorBoundary(): OrchestratorBoundary {
  return {
    enabled: true,
    provider: 'MOCK',
    nodes: PHASE5_ORCHESTRATOR_NODES,
  };
}
