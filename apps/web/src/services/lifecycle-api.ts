import { apiGet, apiPost } from './api';

export interface ReviewResponse {
  transactionId: string;
  referenceCode: string;
  title: string;
  status: string;
  sandbox: boolean;
  disclaimer: string;
  eligibility: 'READY_FOR_REVIEW' | 'NOT_READY' | 'BLOCKED';
  canProceedToPayment: boolean;
  reviewConfirmedAt: string | null;
  service: { id: string; code: string; nameEn: string; nameAr: string };
  applicant: { fullName: string; email: string };
  fields: Array<{ code: string; labelEn: string; value: string | null; source: string }>;
  documents: Array<{
    id: string;
    fileName: string;
    documentType: string | null;
    status: string;
  }>;
  readiness: {
    score: number;
    status: string;
    breakdown: {
      documents: { score: number; completed: number; required: number };
      information: { score: number; completed: number; required: number };
      validation: { score: number };
    };
    issues: Array<{ code: string; severity: string; message: string }>;
    missingRequirements: Array<{ code: string; labelEn: string; status: string }>;
  };
  blockingIssues: Array<{ code: string; message: string }>;
  warnings: Array<{ code: string; message: string }>;
  checklist: Array<{
    code: string;
    label: string;
    description: string;
    status: string;
    blocking: boolean;
  }>;
  nextStep: string;
  paymentSummary: {
    required: boolean;
    serviceFee: number;
    additionalFee: number;
    totalAmount: number;
    currency: string;
  };
}

export interface PaymentResponse {
  transactionId: string;
  referenceCode: string;
  sandbox: boolean;
  label: string;
  disclaimer: string;
  statusLabel: string;
  currency: string;
  serviceFee: number;
  additionalFee: number;
  totalAmount: number;
  feeBreakdown: Array<{ code: string; label: string; amountAed: number }>;
  payment: {
    id: string;
    status: string;
    totalAmount: number;
    paidAt: string | null;
  } | null;
  canPay: boolean;
  canSubmit: boolean;
  message?: string;
  outcome?: string;
}

export interface SubmitResponse {
  transactionId: string;
  referenceCode: string;
  submissionReference: string;
  submittedAt: string;
  status: string;
  label: string;
  disclaimer: string;
}

export interface MonitorResponse {
  transactionId: string;
  referenceCode: string;
  submissionReference: string | null;
  title: string;
  status: string;
  sandbox: boolean;
  disclaimer: string;
  service: { nameEn: string; code: string };
  currentStep: { code: string; label: string; state: string } | null;
  timeline: Array<{
    code: string;
    title: string;
    subtitle: string;
    state: 'completed' | 'current' | 'upcoming';
  }>;
  payment: {
    statusLabel: string;
    totalAmount: number;
    paidAt: string | null;
  };
  estimatedNextStep: string;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
  }>;
  insight: { title: string; summary: string };
  canAdvanceSandbox: boolean;
}

export function fetchReview(id: string) {
  return apiGet<ReviewResponse>(`/transactions/${id}/review`);
}

export function confirmReview(id: string) {
  return apiPost<ReviewResponse>(`/transactions/${id}/review/confirm`, {
    confirmed: true,
  });
}

export function fetchPayment(id: string) {
  return apiGet<PaymentResponse>(`/transactions/${id}/payment`);
}

export function createPayment(id: string) {
  return apiPost<PaymentResponse>(`/transactions/${id}/payment`);
}

export function processPayment(id: string, outcome: 'SUCCESS' | 'FAILURE' = 'SUCCESS') {
  return apiPost<PaymentResponse>(`/transactions/${id}/payment/process`, {
    outcome,
  });
}

export function submitTransaction(id: string) {
  return apiPost<SubmitResponse>(`/transactions/${id}/submit`);
}

export function fetchMonitor(id: string) {
  return apiGet<MonitorResponse>(`/transactions/${id}/monitor`);
}

export function sandboxAdvance(id: string) {
  return apiPost<MonitorResponse>(`/transactions/${id}/sandbox/advance`);
}

export function sandboxReset(id: string) {
  return apiPost<{ reset: boolean; referenceCode: string; status: string }>(
    `/transactions/${id}/sandbox/reset`,
  );
}

export function fetchNotifications() {
  return apiGet<
    Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      isRead: boolean;
      createdAt: string;
    }>
  >('/notifications');
}
