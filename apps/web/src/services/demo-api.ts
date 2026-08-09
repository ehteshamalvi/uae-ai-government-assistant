import { apiGet, apiPost } from './api';

export const DEMO_TX_REF = 'TRX-9824-A71';

export interface DemoStatus {
  demoMode: boolean;
  sandboxControls: boolean;
  production: boolean;
  aiProvider: string;
  demoTransactionReference: string;
  disclaimer: string;
}

export function fetchDemoStatus() {
  return apiGet<DemoStatus>('/demo/status');
}

export function resetDemoTransaction(reference = DEMO_TX_REF) {
  return apiPost<{ reset: boolean; referenceCode: string; status: string }>(
    `/transactions/${reference}/sandbox/reset`,
  );
}
