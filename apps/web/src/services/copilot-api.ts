import { apiGet, apiPost } from './api';

export interface CopilotSession {
  id: string;
  transactionId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  transaction?: {
    referenceCode: string;
    title: string;
    status: string;
  } | null;
}

export interface CopilotSessionDetail extends CopilotSession {
  transaction: {
    id: string;
    referenceCode: string;
    title: string;
    status: string;
    readinessScore: number | null;
    serviceName: string;
    serviceCode: string;
  } | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    citations: unknown;
    createdAt: string;
  }>;
}

export interface CopilotMessageResponse {
  userMessage: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  };
  assistantMessage: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
    confidence: number;
    confidenceBand: string;
    sources: Array<{ type: string; title: string; referenceId?: string }>;
    suggestedActions: Array<{ code: string; label: string; href?: string }>;
    queryClass: string;
    provider: string;
    noKnowledge: boolean;
  };
}

export function createCopilotSession(body?: {
  transactionId?: string;
  title?: string;
}) {
  return apiPost<CopilotSession>('/copilot/sessions', body ?? {});
}

export function listCopilotSessions() {
  return apiGet<CopilotSession[]>('/copilot/sessions');
}

export function fetchCopilotSession(id: string) {
  return apiGet<CopilotSessionDetail>(`/copilot/sessions/${id}`);
}

export function sendCopilotMessage(
  sessionId: string,
  content: string,
  documentId?: string,
) {
  return apiPost<CopilotMessageResponse>(
    `/copilot/sessions/${sessionId}/messages`,
    { content, documentId },
  );
}
