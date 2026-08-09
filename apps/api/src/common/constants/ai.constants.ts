/**
 * Intent confidence band thresholds (single source of truth).
 * Used by API + frontend presentation.
 */
export const INTENT_CONFIDENCE = {
  HIGH_MIN: 0.85,
  MEDIUM_MIN: 0.6,
} as const;

export type IntentConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export function classifyIntentConfidence(
  confidence: number,
): IntentConfidenceBand {
  if (confidence >= INTENT_CONFIDENCE.HIGH_MIN) return 'HIGH';
  if (confidence >= INTENT_CONFIDENCE.MEDIUM_MIN) return 'MEDIUM';
  return 'LOW';
}

/** Supported mock document types for Phase 3. */
export const SUPPORTED_DOCUMENT_TYPES = [
  'PASSPORT',
  'EMIRATES_ID',
  'TRADE_LICENSE',
  'TENANCY_CONTRACT',
  'TRADE_NAME_CERTIFICATE',
  'MEMORANDUM_OF_ASSOCIATION',
  'MOA',
  'NOC',
  'UNKNOWN',
] as const;

export type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number];
