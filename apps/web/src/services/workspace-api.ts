import { apiGet, apiPost } from './api';
import type { ReadinessResponse, TransactionDetail } from './transaction-api';

export interface WorkspaceResponse extends TransactionDetail {
  readiness: ReadinessResponse;
  requiredInformation: Array<{
    code: string;
    labelEn: string;
    type: string;
    status: string;
    message: string;
  }>;
  requiredDocuments: Array<{
    code: string;
    labelEn: string;
    type: string;
    status: string;
    message: string;
    relatedDocumentId?: string;
  }>;
  completedRequirements: Array<{
    code: string;
    labelEn: string;
    status: string;
  }>;
  warnings: Array<{ code: string; severity: string; message: string }>;
  missingRequirements: ReadinessResponse['missingRequirements'];
  nextAction: {
    code: string;
    label: string;
    reason: string;
    priority: number;
  };
  enabledActions: {
    reviewReadiness: boolean;
    uploadDocument: boolean;
    analyzeDocument: boolean;
    completeInformation: boolean;
    prepareApplication: boolean;
    reviewApplication: boolean;
    submit: boolean;
    payment: boolean;
  };
  fields: Array<{
    code: string;
    labelEn: string;
    value: string | null;
    source: string;
    sourceLabel?: string;
    status: string;
    isVerified?: boolean;
    confidence?: number | null;
  }>;
}

export interface CreateTransactionResponse {
  id: string;
  referenceCode: string;
  title: string;
  status: string;
  service: { id: string; code: string; nameEn: string; nameAr: string };
  intentText: string | null;
  confidence: number | null;
}

export function createTransaction(body: {
  serviceId: string;
  intentText?: string;
  confidence?: number;
}) {
  return apiPost<CreateTransactionResponse>('/transactions', body);
}

export function prepareTransaction(id: string) {
  return apiPost<{
    transactionId: string;
    referenceCode: string;
    readiness: ReadinessResponse;
    nextAction: WorkspaceResponse['nextAction'];
    analyzedDocuments: number;
  }>(`/transactions/${id}/prepare`);
}

export function fetchWorkspace(id: string) {
  return apiGet<WorkspaceResponse>(`/transactions/${id}/workspace`);
}

export function analyzeDocument(documentId: string) {
  return apiPost(`/documents/${documentId}/analyze`);
}

export function fetchDocumentAnalysis(documentId: string) {
  return apiGet(`/documents/${documentId}/analysis`);
}
