import { Link, useParams } from 'react-router-dom';
import { DocumentCard } from '@/components/ai/document-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorState, LoadingState } from '@/components/ui/states';
import {
  useAnalyzeDocument,
  usePrepareTransaction,
  useWorkspace,
} from '@/hooks/use-intent';

function sourceTone(source: string): 'ai' | 'info' | 'success' | 'neutral' {
  if (source === 'AI_EXTRACTED' || source.includes('AI')) return 'ai';
  if (source === 'SYSTEM_VERIFIED' || source.includes('System')) return 'success';
  return 'info';
}

function docStatus(status: string): 'valid' | 'warning' | 'missing' | 'invalid' {
  if (status === 'VALID' || status === 'CLASSIFIED') return 'valid';
  if (status === 'WARNING') return 'warning';
  if (status === 'INVALID' || status === 'EXPIRED') return 'invalid';
  return 'missing';
}

export function WorkspacePage() {
  const { id: transactionId = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useWorkspace(transactionId);
  const prepare = usePrepareTransaction();
  const analyzeDoc = useAnalyzeDocument();

  if (isLoading) return <LoadingState label="Loading workspace…" />;
  if (isError || !data) {
    return (
      <ErrorState
        title="Unable to load workspace"
        description={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  const readinessPct = data.readiness?.score ?? data.readinessScore ?? 0;
  const docsBreakdown = data.readiness?.breakdown?.documents;
  const docProgress =
    docsBreakdown && docsBreakdown.required > 0
      ? Math.round((docsBreakdown.completed / docsBreakdown.required) * 100)
      : 0;

  return (
    <div>
      <header className="mb-8 flex items-center justify-between border-b border-surface-variant pb-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="rounded-full p-2 hover:bg-surface-container-high">
            <span className="material-symbols-outlined">close</span>
          </Link>
          <h1 className="font-headline text-2xl font-bold text-primary">Prepare Transaction</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={data.referenceCode} tone="neutral" />
          <StatusBadge label={data.status.replaceAll('_', ' ')} tone="info" />
        </div>
      </header>

      <div className="mb-10">
        <h2 className="mb-2 font-display text-4xl text-primary">{data.service.nameEn}</h2>
        <p className="text-lg text-on-surface-variant">
          Complete the required steps to prepare your application.
        </p>
      </div>

      <div className="mb-12 overflow-x-auto pb-4">
        <div className="flex min-w-[800px] items-center">
          {data.steps.map((step, index) => {
            const done = step.status === 'COMPLETED';
            const active = step.status === 'IN_PROGRESS';
            return (
              <div key={step.code} className="relative flex flex-1 flex-col items-center">
                <div
                  className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                    done
                      ? 'bg-secondary text-on-secondary'
                      : active
                        ? 'bg-primary text-on-primary ring-4 ring-primary-fixed'
                        : 'border border-outline-variant bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {done ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : (
                    <span className="font-label text-xs">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-3 text-center font-label text-xs ${
                    active
                      ? 'font-bold text-primary'
                      : done
                        ? 'text-secondary'
                        : 'text-on-surface-variant'
                  }`}
                >
                  {step.labelEn}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="mb-6 flex items-center gap-2 font-headline text-xl text-primary">
              <span className="material-symbols-outlined text-secondary">description</span>
              Application Summary
            </h3>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {data.fields.map((field) => (
                <div key={field.code} className="space-y-1">
                  <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
                    {field.labelEn}
                  </span>
                  <p className="font-medium text-on-surface">{field.value ?? '—'}</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={field.sourceLabel ?? field.source.replaceAll('_', ' ')}
                      tone={sourceTone(field.source)}
                    />
                    <StatusBadge label={field.status} tone="neutral" />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <span className="font-label text-xs uppercase text-on-surface-variant">
                  Documents
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={docProgress} barClassName="bg-secondary" />
                  <span className="font-label text-sm text-secondary">
                    {docsBreakdown
                      ? `${docsBreakdown.completed} of ${docsBreakdown.required}`
                      : '—'}
                  </span>
                </div>
              </div>
              <div>
                <span className="font-label text-xs uppercase text-on-surface-variant">
                  Readiness
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={readinessPct} />
                  <span className="font-label text-sm font-bold text-primary">
                    {readinessPct}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 font-headline text-xl text-primary">Required Documents</h3>
            <div className="space-y-3">
              {data.requiredDocuments.map((req) => {
                const doc = data.documents.find((d) => d.id === req.relatedDocumentId);
                return (
                  <div key={req.code} className="space-y-2">
                    <DocumentCard
                      title={req.labelEn}
                      status={docStatus(doc?.status ?? req.status)}
                      actionLabel={doc ? 'View' : 'Upload'}
                    />
                    {doc && data.enabledActions.analyzeDocument ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled={analyzeDoc.isPending}
                        onClick={() =>
                          void analyzeDoc.mutateAsync(doc.id).then(() => refetch())
                        }
                      >
                        Analyze Document (Demo AI)
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>

          {data.missingRequirements.length > 0 ? (
            <Card>
              <h3 className="mb-3 font-headline text-xl text-primary">Missing requirements</h3>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                {data.missingRequirements.map((m) => (
                  <li key={m.code}>
                    {m.labelEn} — {m.status}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="ai-insight-layer rounded-xl p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">smart_toy</span>
              <h4 className="font-label text-sm font-bold uppercase tracking-wide text-primary">
                GovFlow AI Insight
              </h4>
            </div>
            <p className="text-on-surface">
              {data.insights[0]?.summary ?? data.nextAction.reason}
            </p>
            <div className="mt-4 rounded border border-outline-variant/50 bg-surface-container-low p-3">
              <p className="font-label text-xs uppercase text-on-surface-variant">
                Next recommended action
              </p>
              <p className="font-medium text-on-surface">{data.nextAction.label}</p>
              <p className="mt-2 border-s-2 border-secondary/30 ps-4 text-sm text-on-surface-variant">
                {data.nextAction.reason}
              </p>
            </div>
            {data.warnings.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-on-surface-variant">
                {data.warnings.map((w) => (
                  <li key={w.code}>{w.message}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <Card className="flex flex-col gap-4">
            {data.enabledActions.prepareApplication ? (
              <Button
                className="w-full"
                disabled={prepare.isPending}
                onClick={() =>
                  void prepare.mutateAsync(data.referenceCode).then(() => refetch())
                }
              >
                <span className="material-symbols-outlined">auto_fix</span>
                {prepare.isPending ? 'Preparing…' : 'Prepare Application'}
              </Button>
            ) : null}
            <Link to={`/transactions/${data.referenceCode}/readiness`}>
              <Button variant="secondary" className="w-full">
                <span className="material-symbols-outlined">monitoring</span>
                Review Readiness
              </Button>
            </Link>
            <Link
              to={`/copilot?transactionId=${encodeURIComponent(data.referenceCode)}`}
            >
              <Button variant="secondary" className="w-full">
                <span className="material-symbols-outlined">psychology</span>
                Ask AI
              </Button>
            </Link>
            {data.enabledActions.reviewApplication ? (
              <Link to={`/transactions/${data.referenceCode}/review`}>
                <Button variant="secondary" className="w-full">
                  <span className="material-symbols-outlined">rate_review</span>
                  Review Application
                </Button>
              </Link>
            ) : null}
            {prepare.isError ? (
              <p className="text-sm text-error">
                {prepare.error instanceof Error ? prepare.error.message : 'Prepare failed'}
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
