export interface IntentEntities {
  companyName: string | null;
  licenseNumber: string | null;
  expiryDate: string | null;
  personName: string | null;
}

export interface IntentServiceCandidate {
  serviceCode: string;
  serviceNameHint: string;
  confidence: number;
}

export interface IntentResult {
  intent: 'SERVICE_REQUEST' | 'UNKNOWN';
  interpretedRequest: string;
  confidence: number;
  serviceCandidate: string | null;
  serviceCandidateCode: string | null;
  candidates: IntentServiceCandidate[];
  entities: IntentEntities;
  provider: string;
  note?: string;
}

export interface IntentProvider {
  analyze(text: string): Promise<IntentResult>;
}

export const INTENT_PROVIDER = Symbol('INTENT_PROVIDER');

export interface DocumentCheckResult {
  imageQuality: 'PASS' | 'WARN' | 'FAIL' | 'SKIP';
  expiry: 'PASS' | 'WARN' | 'FAIL' | 'SKIP';
  requiredFields: 'PASS' | 'WARN' | 'FAIL' | 'SKIP';
}

export interface DocumentAnalysisResult {
  provider: string;
  documentType: string;
  classifiedType: string | null;
  confidence: number;
  fields: Record<string, string | null>;
  checks: DocumentCheckResult;
  summary: string;
  validationScore: number;
  qualityScore: number;
  issues: Array<{ code: string; severity: string; message: string }>;
  status: 'MOCK' | 'COMPLETED' | 'FAILED';
}

export interface DocumentAnalysisProvider {
  analyze(input: {
    fileName: string;
    mimeType: string;
    documentTypeHint?: string | null;
  }): Promise<DocumentAnalysisResult>;
}

export const DOCUMENT_ANALYSIS_PROVIDER = Symbol('DOCUMENT_ANALYSIS_PROVIDER');

export interface AIProvider {
  isEnabled(): boolean;
  providerName(): string;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
