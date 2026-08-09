import { apiGet } from './api';

export interface TransactionListItem {
  id: string;
  referenceCode: string;
  title: string;
  status: string;
  readinessScore: number | null;
  sandbox: boolean;
  service: {
    id: string;
    code: string;
    nameEn: string;
    nameAr: string;
    category: string;
  };
  documentCount: number;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReadinessResponse {
  transactionId: string;
  referenceCode: string;
  score: number;
  status: string;
  breakdown: {
    documents: { score: number; completed: number; required: number };
    information: { score: number; completed: number; required: number };
    validation: { score: number };
  };
  issues: Array<{
    code: string;
    severity: string;
    message: string;
    requirementCode?: string;
  }>;
  missingRequirements: Array<{
    code: string;
    labelEn: string;
    type: string;
    status: string;
  }>;
  recommendations: string[];
  evaluations: Array<{
    code: string;
    type: string;
    labelEn: string;
    status: string;
    isMandatory: boolean;
    message: string;
    relatedDocumentId?: string;
  }>;
  weights: {
    DOCUMENT_WEIGHT: number;
    FIELD_WEIGHT: number;
    VALIDATION_WEIGHT: number;
  };
}

export interface TransactionDetail {
  id: string;
  referenceCode: string;
  title: string;
  status: string;
  readinessScore: number;
  readinessStatus: string;
  sandbox: boolean;
  intentText: string | null;
  service: {
    id: string;
    code: string;
    nameEn: string;
    nameAr: string;
    category: string;
    description: string;
  };
  fields: Array<{
    code: string;
    labelEn: string;
    value: string | null;
    source: string;
  }>;
  steps: Array<{
    code: string;
    labelEn: string;
    status: string;
    sortOrder: number;
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    documentType: string | null;
    status: string;
    analysis: { summary: string | null } | null;
  }>;
  insights: Array<{
    id: string;
    title: string;
    summary: string;
    severity: string | null;
  }>;
}

export function fetchTransactions(params?: {
  search?: string;
  status?: string;
  serviceId?: string;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.serviceId) query.set('serviceId', params.serviceId);
  const qs = query.toString();
  return apiGet<TransactionListItem[]>(`/transactions${qs ? `?${qs}` : ''}`);
}

export function fetchTransaction(id: string) {
  return apiGet<TransactionDetail>(`/transactions/${id}`);
}

export function fetchReadiness(id: string) {
  return apiGet<ReadinessResponse>(`/transactions/${id}/readiness`);
}

export function fetchTransactionDocuments(id: string) {
  return apiGet<TransactionDetail['documents']>(`/transactions/${id}/documents`);
}

export function fetchTransactionSteps(id: string) {
  return apiGet<TransactionDetail['steps']>(`/transactions/${id}/steps`);
}
