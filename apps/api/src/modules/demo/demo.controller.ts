import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DemoModeService } from './demo-mode.service';
import { Public } from '../../common/decorators/auth.decorators';

@Controller('demo')
export class DemoController {
  constructor(
    private readonly demoMode: DemoModeService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('status')
  getStatus() {
    return {
      demoMode: this.demoMode.isEnabled(),
      sandboxControls: this.demoMode.allowSandboxControls(),
      production: this.demoMode.isProduction(),
      aiProvider: this.config.get<string>('aiProvider') ?? 'mock',
      demoTransactionReference: 'TRX-9824-A71',
      disclaimer:
        'SANDBOX DEMONSTRATION — No real government systems connected. No real payments processed.',
    };
  }
}
