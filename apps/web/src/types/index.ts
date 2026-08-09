export const DEMO_TRANSACTION_ID = 'TRX-9824-A71';

export type FieldSource = 'AI_EXTRACTED' | 'USER_PROVIDED' | 'SYSTEM_VERIFIED';

export interface DemoTransaction {
  id: string;
  referenceCode: string;
  title: string;
  status: string;
  readinessScore: number;
  sandbox: boolean;
}
