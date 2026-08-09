import { Module } from '@nestjs/common';
import { PAYMENT_PROVIDER } from './payment.interfaces';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

@Module({
  providers: [
    SandboxPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: SandboxPaymentProvider },
  ],
  exports: [PAYMENT_PROVIDER, SandboxPaymentProvider],
})
export class PaymentProvidersModule {}
