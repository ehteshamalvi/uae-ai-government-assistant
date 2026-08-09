import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DemoModeService {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<boolean>('demoMode'));
  }

  isProduction(): boolean {
    return Boolean(this.config.get<boolean>('isProd'));
  }

  /** Sandbox admin controls (reset/advance) only when demo mode is on and not production. */
  allowSandboxControls(): boolean {
    if (this.isProduction()) return false;
    return this.isEnabled();
  }

  assertSandboxControlsAllowed(action: string): void {
    if (!this.allowSandboxControls()) {
      throw new ForbiddenException(
        `${action} is only available when DEMO_MODE=true (disabled in production)`,
      );
    }
  }
}
