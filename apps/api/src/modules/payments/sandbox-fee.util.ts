/**
 * Sandbox fee calculation — server-side only.
 * Values come from Service.metadata; never trust client amounts.
 */
export interface FeeBreakdownLine {
  code: string;
  label: string;
  amountAed: number;
}

export interface SandboxFeeQuote {
  currency: 'AED';
  serviceFee: number;
  additionalFee: number;
  totalAmount: number;
  feeBreakdown: FeeBreakdownLine[];
  sandbox: true;
  disclaimer: string;
}

export function quoteSandboxFees(metadata: unknown): SandboxFeeQuote {
  const meta =
    metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>)
      : {};

  const serviceFee = Number(meta.baseFeeAed ?? 0);
  const additionalFee = Number(meta.additionalFeeAed ?? 0);

  const feeBreakdown: FeeBreakdownLine[] = [
    {
      code: 'SERVICE_FEE',
      label: 'Service Fee',
      amountAed: serviceFee,
    },
  ];

  if (additionalFee > 0) {
    const label =
      typeof meta.additionalFeeLabel === 'string'
        ? meta.additionalFeeLabel
        : 'Additional Fee';
    feeBreakdown.push({
      code: 'ADDITIONAL_FEE',
      label,
      amountAed: additionalFee,
    });
  }

  return {
    currency: 'AED',
    serviceFee,
    additionalFee,
    totalAmount: serviceFee + additionalFee,
    feeBreakdown,
    sandbox: true,
    disclaimer:
      'SANDBOX DEMO — No real payment or government submission will occur.',
  };
}

/** API-facing payment status labels (mapped from PaymentStatus). */
export type PaymentStatusLabel =
  'NOT_REQUIRED' | 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';

export function mapPaymentStatusLabel(
  status: string | null | undefined,
  paymentRequired: boolean,
): PaymentStatusLabel {
  if (!paymentRequired) return 'NOT_REQUIRED';
  if (!status) return 'PENDING';
  switch (status) {
    case 'SANDBOX_PAID':
    case 'WAIVED':
      return status === 'WAIVED' ? 'NOT_REQUIRED' : 'PAID';
    case 'FAILED':
      return 'FAILED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'AWAITING_REVIEW':
      return 'PROCESSING';
    default:
      return 'PENDING';
  }
}
