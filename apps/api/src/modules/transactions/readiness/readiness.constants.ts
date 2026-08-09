/**
 * Deterministic readiness scoring configuration.
 *
 * Overall score = weighted average of document, field, and validation scores.
 * Weights must sum to 1.0.
 */
export const READINESS_WEIGHTS = {
  DOCUMENT_WEIGHT: 0.4,
  FIELD_WEIGHT: 0.35,
  VALIDATION_WEIGHT: 0.25,
} as const;

/**
 * Readiness status thresholds (inclusive ranges).
 * BLOCKED overrides these when any mandatory requirement is BLOCKED.
 */
export const READINESS_THRESHOLDS = {
  NOT_STARTED_MAX: 24,
  IN_PROGRESS_MAX: 59,
  ALMOST_READY_MAX: 89,
  // 90–100 => READY
} as const;

export type ReadinessStatusLabel =
  'NOT_STARTED' | 'IN_PROGRESS' | 'ALMOST_READY' | 'READY' | 'BLOCKED';

export type RequirementEvalStatus =
  'COMPLETE' | 'MISSING' | 'WARNING' | 'BLOCKED';

/** Document statuses treated as acceptably complete for scoring. */
export const ACCEPTABLE_DOCUMENT_STATUSES = new Set([
  'VALID',
  'CLASSIFIED',
  'WARNING',
]);

/** Document statuses that block readiness. */
export const BLOCKING_DOCUMENT_STATUSES = new Set(['INVALID', 'EXPIRED']);
