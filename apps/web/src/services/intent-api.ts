import { apiPost } from './api';

export interface IntentAnalyzeResponse {
  intent: string;
  interpretedRequest: string;
  serviceCandidate: {
    id: string;
    code: string;
    nameEn: string;
    nameAr: string;
    category: string;
    description: string;
  } | null;
  serviceCandidateName: string | null;
  confidence: number;
  confidenceBand: 'HIGH' | 'MEDIUM' | 'LOW';
  entities: {
    companyName: string | null;
    licenseNumber: string | null;
    expiryDate: string | null;
    personName: string | null;
  };
  alternatives: Array<{
    id: string;
    code: string;
    nameEn: string;
    nameAr: string;
    category: string;
    confidence: number;
    confidenceBand: string;
  }>;
  suggestedNextAction: string;
  provider: string;
  note?: string;
}

export function analyzeIntent(message: string) {
  return apiPost<IntentAnalyzeResponse>('/intent/analyze', { message });
}
