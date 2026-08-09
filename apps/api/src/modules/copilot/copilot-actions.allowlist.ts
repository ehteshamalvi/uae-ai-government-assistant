/**
 * Explicit allowlist of Copilot-suggested frontend actions.
 * AI must never invent arbitrary URLs or execute state changes.
 */
export const COPILOT_ACTION_ALLOWLIST = [
  'VIEW_READINESS',
  'REVIEW_READINESS',
  'VIEW_REQUIREMENTS',
  'VIEW_DOCUMENT',
  'REVIEW_DOCUMENT',
  'UPLOAD_DOCUMENT',
  'COMPLETE_INFORMATION',
  'PREPARE_APPLICATION',
  'OPEN_FINAL_REVIEW',
  'OPEN_REVIEW',
  'OPEN_PAYMENT',
  'OPEN_MONITOR',
  'OPEN_MONITORING',
  'OPEN_TRANSACTION',
  'OPEN_SEARCH',
] as const;

export type CopilotActionCode = (typeof COPILOT_ACTION_ALLOWLIST)[number];

const ALLOWED = new Set<string>(COPILOT_ACTION_ALLOWLIST);

export function isAllowedCopilotAction(code: string): boolean {
  return ALLOWED.has(code);
}

export function filterAllowedActions<
  T extends { code: string; label: string; href?: string },
>(actions: T[]): T[] {
  return actions.filter((a) => isAllowedCopilotAction(a.code));
}

/** Map allowlisted codes to in-app routes only. */
export function actionHref(
  code: string,
  referenceCode?: string,
): string | undefined {
  if (!isAllowedCopilotAction(code)) return undefined;
  if (!referenceCode) {
    if (code === 'OPEN_SEARCH') return '/search';
    return '/copilot';
  }
  const base = `/transactions/${referenceCode}`;
  switch (code) {
    case 'VIEW_READINESS':
    case 'REVIEW_READINESS':
      return `${base}/readiness`;
    case 'VIEW_REQUIREMENTS':
    case 'VIEW_DOCUMENT':
    case 'REVIEW_DOCUMENT':
    case 'UPLOAD_DOCUMENT':
    case 'COMPLETE_INFORMATION':
    case 'PREPARE_APPLICATION':
    case 'OPEN_TRANSACTION':
      return `${base}/workspace`;
    case 'OPEN_FINAL_REVIEW':
    case 'OPEN_REVIEW':
      return `${base}/review`;
    case 'OPEN_PAYMENT':
      return `${base}/payment`;
    case 'OPEN_MONITOR':
    case 'OPEN_MONITORING':
      return `${base}/monitor`;
    case 'OPEN_SEARCH':
      return '/search';
    default:
      return undefined;
  }
}
