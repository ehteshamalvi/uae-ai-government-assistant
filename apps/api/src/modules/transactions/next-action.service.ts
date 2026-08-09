export type NextActionCode =
  | 'UPLOAD_DOCUMENT'
  | 'REVIEW_DOCUMENT'
  | 'ANALYZE_DOCUMENT'
  | 'COMPLETE_INFORMATION'
  | 'PREPARE_APPLICATION'
  | 'REVIEW_APPLICATION'
  | 'REVIEW_READINESS';

export interface NextAction {
  code: NextActionCode;
  label: string;
  reason: string;
  priority: number;
}

export interface NextActionInput {
  readinessScore: number;
  readinessStatus: string;
  missingDocuments: number;
  warningDocuments: number;
  invalidDocuments: number;
  unanalyzedDocuments: number;
  missingFields: number;
  hasPreparedStep: boolean;
  blocked: boolean;
}

/**
 * Deterministic next-action engine — not an AI agent.
 */
export function calculateNextAction(input: NextActionInput): NextAction {
  if (input.blocked || input.invalidDocuments > 0) {
    return {
      code: 'REVIEW_DOCUMENT',
      label: 'Review document',
      reason: 'One or more documents are invalid or blocking readiness.',
      priority: 1,
    };
  }

  if (input.missingDocuments > 0) {
    return {
      code: 'UPLOAD_DOCUMENT',
      label: 'Upload required document',
      reason: `${input.missingDocuments} required document(s) are missing.`,
      priority: 1,
    };
  }

  if (input.unanalyzedDocuments > 0) {
    return {
      code: 'ANALYZE_DOCUMENT',
      label: 'Analyze document',
      reason: 'Uploaded documents are waiting for AI analysis.',
      priority: 2,
    };
  }

  if (input.warningDocuments > 0) {
    return {
      code: 'REVIEW_DOCUMENT',
      label: 'Review document',
      reason: 'A document has a demo validation warning.',
      priority: 2,
    };
  }

  if (input.missingFields > 0) {
    return {
      code: 'COMPLETE_INFORMATION',
      label: 'Complete application information',
      reason: `${input.missingFields} required field(s) still need values.`,
      priority: 3,
    };
  }

  if (!input.hasPreparedStep) {
    return {
      code: 'PREPARE_APPLICATION',
      label: 'Prepare application',
      reason:
        'Requirements look complete — run preparation to refresh readiness.',
      priority: 4,
    };
  }

  if (input.readinessScore >= 90 && input.readinessStatus !== 'BLOCKED') {
    return {
      code: 'REVIEW_APPLICATION',
      label: 'Review application',
      reason:
        'Readiness is high enough for user review (submission is Phase 4).',
      priority: 5,
    };
  }

  return {
    code: 'REVIEW_READINESS',
    label: 'Review readiness',
    reason: 'Check remaining readiness gaps before continuing.',
    priority: 5,
  };
}
