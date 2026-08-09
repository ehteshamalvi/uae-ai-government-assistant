import { DemoModeService } from './demo-mode.service';
import {
  filterAllowedActions,
  isAllowedCopilotAction,
} from '../copilot/copilot-actions.allowlist';
import { MockCopilotAIProvider } from '../copilot/mock-copilot-ai.provider';
import configuration from '../../config/configuration';

function withEnv<T>(env: Record<string, string | undefined>, run: () => T): T {
  const keys = Object.keys(env);
  const backup = new Map(keys.map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return run();
  } finally {
    for (const k of keys) {
      const prev = backup.get(k);
      if (prev === undefined) delete process.env[k];
      else process.env[k] = prev;
    }
  }
}

describe('DemoModeService', () => {
  function service(env: Record<string, string | undefined>) {
    return withEnv(env, () => {
      const cfg = configuration();
      const configService = {
        get: (key: string) => {
          if (key === 'demoMode') return cfg.demoMode;
          if (key === 'isProd') return cfg.isProd;
          return undefined;
        },
      };
      return new DemoModeService(configService as never);
    });
  }

  it('enables demo mode by default outside production', () => {
    const s = service({ NODE_ENV: 'development', DEMO_MODE: undefined });
    expect(s.isEnabled()).toBe(true);
    expect(s.allowSandboxControls()).toBe(true);
  });

  it('disables sandbox controls in production even if DEMO_MODE=true', () => {
    const s = service({ NODE_ENV: 'production', DEMO_MODE: 'true' });
    expect(s.isProduction()).toBe(true);
    expect(s.allowSandboxControls()).toBe(false);
    expect(() => s.assertSandboxControlsAllowed('Demo reset')).toThrow(
      /DEMO_MODE/,
    );
  });

  it('respects DEMO_MODE=false', () => {
    const s = service({ NODE_ENV: 'development', DEMO_MODE: 'false' });
    expect(s.isEnabled()).toBe(false);
    expect(s.allowSandboxControls()).toBe(false);
  });
});

describe('Copilot action allowlist', () => {
  it('allows known navigation actions only', () => {
    expect(isAllowedCopilotAction('VIEW_READINESS')).toBe(true);
    expect(isAllowedCopilotAction('OPEN_PAYMENT')).toBe(true);
    expect(isAllowedCopilotAction('DELETE_TRANSACTION')).toBe(false);
    expect(isAllowedCopilotAction('EXECUTE_PAYMENT')).toBe(false);
  });

  it('filters arbitrary actions', () => {
    const filtered = filterAllowedActions([
      { code: 'VIEW_READINESS', label: 'ok' },
      { code: 'https://evil.example', label: 'bad' },
      { code: 'OPEN_MONITOR', label: 'ok2' },
    ]);
    expect(filtered.map((a) => a.code)).toEqual([
      'VIEW_READINESS',
      'OPEN_MONITOR',
    ]);
  });
});

describe('Unknown Copilot queries with active transaction', () => {
  const provider = new MockCopilotAIProvider();

  it('does not dump unrelated knowledge for UNKNOWN', async () => {
    const result = await provider.generate({
      message: 'quantum banana legislation xyz',
      queryClass: 'UNKNOWN',
      transactionContext: {
        referenceCode: 'TRX-9824-A71',
        title: 'Trade License Renewal',
        status: 'PREPARING',
        service: {
          code: 'TRADE_LICENSE_RENEWAL',
          nameEn: 'Trade License Renewal',
        },
        readiness: {
          score: 88,
          status: 'ALMOST_READY',
          breakdown: {
            documents: { score: 100, completed: 4, required: 4 },
            information: { score: 100, completed: 5, required: 5 },
            validation: { score: 50 },
          },
          issues: [],
          missingRequirements: [],
        },
        fields: [],
        documents: [],
        payment: { statusLabel: 'PENDING', totalAmount: 100, required: true },
        submissionReference: null,
        submittedAt: null,
        reviewConfirmedAt: null,
        nextAction: { code: 'REVIEW', label: 'Review', reason: 'demo' },
        timelineSteps: [],
      },
      knowledgeChunks: [
        {
          id: 'x',
          documentId: 'unrelated',
          title: 'Unrelated',
          content: 'Should not be used automatically for UNKNOWN',
          score: 0.5,
          metadata: {
            category: 'SERVICE',
            serviceCode: 'OTHER',
            sourceType: 'GOVFLOW_DEMO_KNOWLEDGE',
          },
        },
      ],
      recentMessages: [],
    });
    expect(result.noKnowledge).toBe(true);
    expect(result.answer.toLowerCase()).toContain(
      'enough relevant information',
    );
    expect(result.answer).not.toContain('Should not be used');
    expect(
      result.suggestedActions.some((a) => a.code === 'VIEW_READINESS'),
    ).toBe(true);
  });
});

describe('configuration production safety', () => {
  it('requires empty webOrigin default in production when unset', () => {
    withEnv(
      {
        NODE_ENV: 'production',
        WEB_ORIGIN: undefined,
        CORS_ORIGIN: undefined,
        DEMO_MODE: undefined,
      },
      () => {
        const cfg = configuration();
        expect(cfg.webOrigin).toBe('');
        expect(cfg.demoMode).toBe(false);
      },
    );
  });
});
