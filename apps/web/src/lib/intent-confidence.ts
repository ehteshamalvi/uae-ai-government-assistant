/**
 * Intent confidence band thresholds — single source of truth for the web app.
 * Keep aligned with apps/api/src/common/constants/ai.constants.ts
 */
export const INTENT_CONFIDENCE = {
  HIGH_MIN: 0.85,
  MEDIUM_MIN: 0.6,
} as const;

export type IntentConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export function classifyIntentConfidence(confidence: number): IntentConfidenceBand {
  if (confidence >= INTENT_CONFIDENCE.HIGH_MIN) return 'HIGH';
  if (confidence >= INTENT_CONFIDENCE.MEDIUM_MIN) return 'MEDIUM';
  return 'LOW';
}
