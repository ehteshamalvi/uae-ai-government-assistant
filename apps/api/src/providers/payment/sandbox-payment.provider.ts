import { Injectable } from '@nestjs/common';
import type {
  PaymentCreateInput,
  PaymentProvider,
  PaymentRecord,
  SandboxPaymentOutcome,
} from './payment.interfaces';

/**
 * Demo-only payment processor. Never charges real money.
 * Outcome is explicit (SUCCESS | FAILURE) — never random.
 */
@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  providerName() {
    return 'SANDBOX';
  }

  create(input: PaymentCreateInput) {
    return Promise.resolve({
      transactionId: input.transactionId,
      currency: input.currency,
      serviceFee: input.serviceFee,
      additionalFee: input.additionalFee,
      totalAmount: input.totalAmount,
      feeBreakdown: input.feeBreakdown,
      status: 'DRAFT',
      sandbox: true,
      reviewedAt: null,
      paidAt: null,
    });
  }

  process(_payment: PaymentRecord, outcome: SandboxPaymentOutcome) {
    if (outcome === 'FAILURE') {
      return Promise.resolve({
        status: 'FAILED',
        paidAt: null,
        message:
          'Sandbox payment failed (demo FAILURE mode). No real charge occurred.',
      });
    }
    return Promise.resolve({
      status: 'SANDBOX_PAID',
      paidAt: new Date(),
      message: 'Sandbox payment successful. No real money was charged.',
    });
  }
}
