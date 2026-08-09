import { randomBytes } from 'crypto';

const FORBIDDEN_REFS = new Set(['TRX-9824-A71']);

export function generateTransactionReference(): string {
  for (let i = 0; i < 8; i++) {
    const partA = randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
    const partB = randomBytes(2).toString('hex').toUpperCase().slice(0, 3);
    const ref = `TRX-${partA}-${partB}`;
    if (!FORBIDDEN_REFS.has(ref)) return ref;
  }
  return `TRX-${Date.now().toString(36).toUpperCase()}-X`;
}

export const DEFAULT_TRANSACTION_STEPS = [
  {
    code: 'SERVICE_IDENTIFIED',
    labelEn: 'Service Identified',
    labelAr: 'تم تحديد الخدمة',
    sortOrder: 1,
  },
  {
    code: 'REQUIREMENTS_CHECKED',
    labelEn: 'Requirements Checked',
    labelAr: 'تم فحص المتطلبات',
    sortOrder: 2,
  },
  {
    code: 'DOCUMENTS_VALIDATED',
    labelEn: 'Documents Validated',
    labelAr: 'تم التحقق من المستندات',
    sortOrder: 3,
  },
  {
    code: 'APPLICATION_PREPARED',
    labelEn: 'Application Prepared',
    labelAr: 'تم إعداد الطلب',
    sortOrder: 4,
  },
  {
    code: 'USER_REVIEW',
    labelEn: 'User Review',
    labelAr: 'مراجعة المستخدم',
    sortOrder: 5,
  },
  {
    code: 'SUBMISSION',
    labelEn: 'Submission',
    labelAr: 'التقديم',
    sortOrder: 6,
  },
] as const;

export type FieldStatusLabel =
  'MISSING' | 'PENDING' | 'VALID' | 'WARNING' | 'INVALID';

export function deriveFieldStatus(field: {
  value: string | null;
  source: string;
  isVerified: boolean;
  confidence: number | null;
}): FieldStatusLabel {
  if (!field.value?.trim()) return 'MISSING';
  if (field.isVerified || field.source === 'SYSTEM_VERIFIED') return 'VALID';
  if (
    field.source === 'AI_EXTRACTED' &&
    field.confidence != null &&
    field.confidence < 0.7
  ) {
    return 'WARNING';
  }
  if (field.source === 'AI_EXTRACTED') return 'VALID';
  return 'PENDING';
}
