import {
  assertTransition,
  canTransition,
  nextSandboxAdvance,
} from './transaction-state-machine';
import { TransactionStatus } from '@prisma/client';
import { ReviewService } from './review.service';
import {
  quoteSandboxFees,
  mapPaymentStatusLabel,
} from '../payments/sandbox-fee.util';
import { SandboxPaymentProvider } from '../../providers/payment/sandbox-payment.provider';

describe('transaction state machine', () => {
  it('allows happy-path transitions', () => {
    expect(
      canTransition(
        TransactionStatus.PREPARING,
        TransactionStatus.READY_FOR_REVIEW,
      ),
    ).toBe(true);
    expect(
      canTransition(
        TransactionStatus.PREPARING,
        TransactionStatus.PAYMENT_PENDING,
      ),
    ).toBe(true);
    expect(
      canTransition(
        TransactionStatus.READY_FOR_REVIEW,
        TransactionStatus.PAYMENT_PENDING,
      ),
    ).toBe(true);
    expect(
      canTransition(
        TransactionStatus.PAYMENT_PENDING,
        TransactionStatus.SUBMITTED,
      ),
    ).toBe(true);
    expect(
      canTransition(TransactionStatus.SUBMITTED, TransactionStatus.PROCESSING),
    ).toBe(true);
    expect(
      canTransition(TransactionStatus.PROCESSING, TransactionStatus.COMPLETED),
    ).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(() =>
      assertTransition(TransactionStatus.DRAFT, TransactionStatus.COMPLETED),
    ).toThrow(/Invalid sandbox status transition/);
  });

  it('advances sandbox one step at a time', () => {
    expect(nextSandboxAdvance(TransactionStatus.SUBMITTED)).toBe(
      TransactionStatus.PROCESSING,
    );
    expect(nextSandboxAdvance(TransactionStatus.PROCESSING)).toBe(
      TransactionStatus.COMPLETED,
    );
    expect(nextSandboxAdvance(TransactionStatus.COMPLETED)).toBeNull();
  });
});

describe('review eligibility', () => {
  const review = new ReviewService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('marks READY_FOR_REVIEW when almost ready without missing', () => {
    expect(
      review.evaluateEligibility({
        status: 'ALMOST_READY',
        issues: [{ severity: 'warning' }],
        missingRequirements: [],
      }),
    ).toBe('READY_FOR_REVIEW');
  });

  it('marks BLOCKED when readiness blocked', () => {
    expect(
      review.evaluateEligibility({
        status: 'BLOCKED',
        issues: [{ severity: 'error' }],
        missingRequirements: [],
      }),
    ).toBe('BLOCKED');
  });

  it('marks NOT_READY when mandatory missing', () => {
    expect(
      review.evaluateEligibility({
        status: 'IN_PROGRESS',
        issues: [],
        missingRequirements: [{ status: 'MISSING' }],
      }),
    ).toBe('NOT_READY');
  });

  it('builds checklist with warning validation', () => {
    const checklist = review.buildChecklist({
      readiness: {
        score: 88,
        status: 'ALMOST_READY',
        breakdown: {
          documents: { completed: 4, required: 4, score: 100 },
          information: { completed: 5, required: 5, score: 100 },
          validation: { score: 50 },
        },
        issues: [{ severity: 'warning' }],
        missingRequirements: [],
      },
      paymentStatus: null,
      paymentRequired: true,
      reviewConfirmed: false,
      submitted: false,
    });
    expect(checklist.find((c) => c.code === 'VALIDATION')?.status).toBe(
      'WARNING',
    );
    expect(checklist.find((c) => c.code === 'PAYMENT')?.status).toBe('PENDING');
  });
});

describe('sandbox fees and payment provider', () => {
  it('quotes fees from service metadata', () => {
    const quote = quoteSandboxFees({
      baseFeeAed: 500,
      additionalFeeAed: 50,
    });
    expect(quote.serviceFee).toBe(500);
    expect(quote.additionalFee).toBe(50);
    expect(quote.totalAmount).toBe(550);
    expect(quote.sandbox).toBe(true);
  });

  it('maps payment status labels', () => {
    expect(mapPaymentStatusLabel('SANDBOX_PAID', true)).toBe('PAID');
    expect(mapPaymentStatusLabel('FAILED', true)).toBe('FAILED');
    expect(mapPaymentStatusLabel(null, false)).toBe('NOT_REQUIRED');
  });

  it('processes SUCCESS and FAILURE explicitly', async () => {
    const provider = new SandboxPaymentProvider();
    const base = {
      id: 'p1',
      transactionId: 't1',
      currency: 'AED',
      serviceFee: 100,
      additionalFee: 0,
      totalAmount: 100,
      status: 'AWAITING_REVIEW',
      feeBreakdown: [],
      sandbox: true,
      reviewedAt: null,
      paidAt: null,
    };
    const ok = await provider.process(base, 'SUCCESS');
    expect(ok.status).toBe('SANDBOX_PAID');
    const fail = await provider.process(base, 'FAILURE');
    expect(fail.status).toBe('FAILED');
  });
});
