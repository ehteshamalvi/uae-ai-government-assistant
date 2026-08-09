import { Controller, Get } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('status')
  getStatus() {
    return {
      module: this.paymentsService.getModuleName(),
      status: 'ready',
      message:
        'Sandbox payments via SandboxPaymentProvider. Use /transactions/:id/payment.',
      failureMode:
        'POST /transactions/:id/payment/process with { "outcome": "FAILURE" | "SUCCESS" }',
    };
  }
}
