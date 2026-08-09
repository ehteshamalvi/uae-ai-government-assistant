export type SandboxPaymentOutcome = 'SUCCESS' | 'FAILURE';

export interface PaymentCreateInput {
  transactionId: string;
  currency: string;
  serviceFee: number;
  additionalFee: number;
  totalAmount: number;
  feeBreakdown: unknown;
}

export interface PaymentRecord {
  id: string;
  transactionId: string;
  currency: string;
  serviceFee: number;
  additionalFee: number;
  totalAmount: number;
  status: string;
  feeBreakdown: unknown;
  sandbox: boolean;
  reviewedAt: Date | null;
  paidAt: Date | null;
}

export interface PaymentProvider {
  providerName(): string;
  create(input: PaymentCreateInput): Promise<Partial<PaymentRecord>>;
  process(
    payment: PaymentRecord,
    outcome: SandboxPaymentOutcome,
  ): Promise<{ status: string; paidAt: Date | null; message: string }>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
