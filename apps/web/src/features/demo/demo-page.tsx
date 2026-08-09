import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogicLabel, LabeledInsight } from '@/components/ui/logic-label';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDemoStatus, useResetDemo } from '@/hooks/use-demo';
import { useTransaction } from '@/hooks/use-transactions';
import { DEMO_TX_REF } from '@/services/demo-api';

const DEMO_STEPS = [
  {
    step: 1,
    title: 'Understand Request',
    href: '/search',
    explanation: 'AI Intent analyzes natural language and maps it to a catalog service.',
    kind: 'ai' as const,
  },
  {
    step: 2,
    title: 'Prepare Transaction',
    href: `/transactions/${DEMO_TX_REF}/workspace`,
    explanation: 'Deterministic preparation creates fields, documents, and steps from the service catalog.',
    kind: 'deterministic' as const,
  },
  {
    step: 3,
    title: 'Check Readiness',
    href: `/transactions/${DEMO_TX_REF}/readiness`,
    explanation: 'The readiness engine scores documents, information, and validation — not the LLM.',
    kind: 'deterministic' as const,
  },
  {
    step: 4,
    title: 'Review',
    href: `/transactions/${DEMO_TX_REF}/review`,
    explanation: 'Final review uses backend eligibility. The user must confirm before payment.',
    kind: 'deterministic' as const,
  },
  {
    step: 5,
    title: 'Sandbox Payment',
    href: `/transactions/${DEMO_TX_REF}/payment`,
    explanation: 'Sandbox payment provider simulates success/failure. No card data is collected.',
    kind: 'sandbox' as const,
  },
  {
    step: 6,
    title: 'Submit',
    href: `/transactions/${DEMO_TX_REF}/payment`,
    explanation: 'Sandbox submission records a demo reference. No government system is contacted.',
    kind: 'sandbox' as const,
  },
  {
    step: 7,
    title: 'Monitor',
    href: `/transactions/${DEMO_TX_REF}/monitor`,
    explanation: 'Monitoring timeline reflects database status. Sandbox Advance simulates progression.',
    kind: 'sandbox' as const,
  },
  {
    step: 8,
    title: 'Complete',
    href: `/transactions/${DEMO_TX_REF}/monitor`,
    explanation: 'Completion is a sandbox terminal state for demonstration only.',
    kind: 'sandbox' as const,
  },
];

function stepFromStatus(status?: string): number {
  switch (status) {
    case 'DRAFT':
    case 'IDENTIFIED':
      return 1;
    case 'PREPARING':
      return 3;
    case 'READY_FOR_REVIEW':
    case 'UNDER_REVIEW':
      return 4;
    case 'PAYMENT_PENDING':
      return 5;
    case 'SUBMITTED':
      return 7;
    case 'PROCESSING':
    case 'UNDER_REVIEW_EXTERNAL':
      return 7;
    case 'COMPLETED':
    case 'ISSUED':
    case 'APPROVED':
      return 8;
    default:
      return 2;
  }
}

export function DemoPage() {
  const demo = useDemoStatus();
  const tx = useTransaction(DEMO_TX_REF);
  const reset = useResetDemo();
  const currentStep = stepFromStatus(tx.data?.status);

  if (demo.isLoading) return <LoadingState label="Loading demo status…" />;
  if (demo.isError) {
    return (
      <ErrorState
        title="Demo status unavailable"
        description={demo.error instanceof Error ? demo.error.message : undefined}
        onRetry={() => void demo.refetch()}
      />
    );
  }

  if (demo.data && !demo.data.demoMode) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <h1 className="font-display text-3xl text-primary">Council Demo Mode</h1>
          <p className="mt-3 text-on-surface-variant">
            Demo Mode is disabled on this API. Set DEMO_MODE=true for local council demonstrations.
            Production keeps demo controls off by default.
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button>Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header className="space-y-4">
        <StatusBadge label="SANDBOX DEMONSTRATION" tone="warning" />
        <h1 className="font-display text-4xl font-semibold text-primary md:text-5xl">
          GovFlow AI
        </h1>
        <p className="max-w-2xl font-headline text-xl text-primary/90">
          AI-Powered Government Transaction Intelligence &amp; Automation Platform
        </p>
        <p className="max-w-2xl text-on-surface-variant">
          A sandbox demonstration of AI-assisted digital government transaction workflows.
        </p>
        <p className="text-sm font-medium text-error">
          No real government systems connected. No real payments processed.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link to="/search">
            <Button>
              Start Council Demo
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Button>
          </Link>
          <Link to={`/transactions/${DEMO_TX_REF}/workspace`}>
            <Button variant="secondary">Open Seeded Transaction</Button>
          </Link>
          {demo.data?.sandboxControls ? (
            <Button
              variant="danger"
              disabled={reset.isPending}
              onClick={() => void reset.mutateAsync()}
            >
              {reset.isPending ? 'Resetting…' : 'Reset Demo'}
            </Button>
          ) : null}
        </div>
        {reset.isSuccess ? (
          <p className="text-sm text-secondary-fixed-dim" role="status">
            Demo transaction reset to PREPARING.
          </p>
        ) : null}
        {reset.isError ? (
          <p className="text-sm text-error" role="alert">
            {reset.error instanceof Error ? reset.error.message : 'Reset failed'}
          </p>
        ) : null}
      </header>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-headline text-2xl text-primary">Demo Progress</h2>
          <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
            <span>Ref: {DEMO_TX_REF}</span>
            <span>·</span>
            <span>Status: {(tx.data?.status ?? '…').replaceAll('_', ' ')}</span>
            <span>·</span>
            <span>AI: {demo.data?.aiProvider ?? 'mock'}</span>
          </div>
        </div>
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {DEMO_STEPS.map((s) => {
            const done = s.step < currentStep;
            const current = s.step === currentStep;
            return (
              <li key={s.step}>
                <Link
                  to={s.href}
                  className={`block rounded-xl border p-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                    current
                      ? 'border-primary bg-primary-container/40'
                      : done
                        ? 'border-outline-variant bg-surface-container-low'
                        : 'border-outline-variant/60 bg-surface-container-lowest'
                  }`}
                  aria-current={current ? 'step' : undefined}
                >
                  <p className="font-label text-[10px] uppercase tracking-wider text-outline">
                    Step {s.step}
                  </p>
                  <p className="mt-1 font-label text-sm font-semibold text-primary">{s.title}</p>
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card>
        <h2 className="mb-4 font-headline text-2xl text-primary">What&apos;s happening?</h2>
        <div className="space-y-5">
          {DEMO_STEPS.filter((s) => s.step === currentStep || s.step === currentStep - 1)
            .slice(-2)
            .map((s) => (
              <LabeledInsight key={s.step} kind={s.kind}>
                <p className="font-medium text-primary">
                  Step {s.step}: {s.title}
                </p>
                <p className="mt-1">{s.explanation}</p>
              </LabeledInsight>
            ))}
          <div className="flex flex-wrap gap-2 border-t border-outline-variant pt-4">
            <LogicLabel kind="ai" />
            <LogicLabel kind="deterministic" />
            <LogicLabel kind="sandbox" />
          </div>
          <p className="text-sm text-on-surface-variant">
            AI recommends. Deterministic services enforce. User confirms. Workflow executes.
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-headline text-xl text-primary">Suggested path</h2>
        <ol className="list-decimal space-y-2 ps-5 text-sm text-on-surface-variant">
          <li>Run AI Intent on Search</li>
          <li>Open seeded transaction workspace ({DEMO_TX_REF})</li>
          <li>Review readiness and ask Copilot to explain</li>
          <li>Confirm final review → sandbox payment → submit</li>
          <li>Monitor and use Sandbox Advance when available</li>
          <li>Reset Demo to repeat for the next reviewer</li>
        </ol>
        <Link
          to={`/copilot?transactionId=${encodeURIComponent(DEMO_TX_REF)}`}
          className="mt-4 inline-block"
        >
          <Button variant="ai">
            <span className="material-symbols-outlined">smart_toy</span>
            Explain with AI
          </Button>
        </Link>
      </Card>
    </div>
  );
}
