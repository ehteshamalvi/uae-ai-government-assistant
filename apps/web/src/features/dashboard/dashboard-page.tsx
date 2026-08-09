import { Link } from 'react-router-dom';
import { AiInsightCard } from '@/components/ai/ai-insight-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useTranslation } from '@/i18n';
import { useLocaleStore } from '@/stores/locale-store';
import { useTransactions } from '@/hooks/use-transactions';
import { useWorkspace } from '@/hooks/use-intent';

export function DashboardPage() {
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useTranslation(locale);
  const { data, isLoading, isError, error, refetch } = useTransactions();

  const active =
    data?.filter((tx) => !['ISSUED', 'CANCELLED', 'REJECTED'].includes(tx.status)) ??
    [];
  const primary = active[0] ?? data?.[0];
  const workspace = useWorkspace(primary?.referenceCode);

  return (
    <div className="mx-auto max-w-[1440px]">
      <section className="mb-12">
        <h2 className="mb-6 font-display text-4xl font-semibold text-primary md:text-5xl">
          {t('dashboard.hero')}
        </h2>
        <div className="glass-panel mb-4 flex items-center rounded-xl p-2 shadow-tinted focus-within:ring-2 focus-within:ring-primary">
          <input
            className="w-full bg-transparent p-4 font-body text-lg text-primary outline-none placeholder:text-outline"
            placeholder={t('dashboard.placeholder')}
            defaultValue=""
            readOnly
            onFocus={(e) => e.currentTarget.blur()}
          />
          <Link to="/search">
            <Button>
              {t('actions.process')}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Button>
          </Link>
        </div>
      </section>

      {isLoading ? <LoadingState label="Loading transactions…" /> : null}
      {isError ? (
        <ErrorState
          title="Unable to load dashboard"
          description={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-8 lg:col-span-8">
            {primary ? (
              <AiInsightCard title={primary.title}>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <p className="text-on-surface-variant">{t('dashboard.readiness')}</p>
                    <p className="mt-1 text-xs text-outline">{primary.referenceCode}</p>
                    {workspace.data?.steps?.length ? (
                      <p className="mt-2 text-sm text-on-surface-variant">
                        Step:{' '}
                        {workspace.data.steps.find((s) => s.status === 'IN_PROGRESS')
                          ?.labelEn ??
                          workspace.data.steps.find((s) => s.status === 'COMPLETED')
                            ?.labelEn ??
                          primary.status}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-end">
                    <div className="font-display text-4xl text-secondary-fixed-dim">
                      {workspace.data?.readiness?.score ?? primary.readinessScore ?? '—'}%
                    </div>
                    <div className="font-label text-xs uppercase tracking-widest text-primary">
                      {primary.status.replaceAll('_', ' ')}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link to={`/transactions/${primary.referenceCode}/workspace`}>
                    <Button className="w-full sm:w-auto">
                      Continue Transaction
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </Button>
                  </Link>
                  <Link to={`/transactions/${primary.referenceCode}/readiness`}>
                    <Button variant="secondary" className="w-full sm:w-auto">
                      Review Readiness
                    </Button>
                  </Link>
                  <Link
                    to={`/copilot?transactionId=${encodeURIComponent(primary.referenceCode)}`}
                  >
                    <Button variant="ai" className="w-full sm:w-auto">
                      Ask AI about your transaction
                    </Button>
                  </Link>
                </div>
              </AiInsightCard>
            ) : (
              <Card>
                <p className="text-on-surface-variant">No active transactions yet.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to="/search">
                    <Button>Start New Transaction</Button>
                  </Link>
                  <Link to="/demo">
                    <Button variant="secondary">Council Demo</Button>
                  </Link>
                </div>
              </Card>
            )}

            <div>
              <h3 className="mb-4 font-headline text-2xl text-primary">{t('dashboard.active')}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {active.map((tx) => (
                  <Card key={tx.id} className="border-t-2 border-primary">
                    <div className="mb-3 flex items-center justify-between">
                      <StatusBadge label={tx.status.replaceAll('_', ' ')} tone="ai" />
                      <span className="text-xs text-outline">{tx.referenceCode}</span>
                    </div>
                    <h4 className="mb-2 font-headline text-xl text-primary">{tx.title}</h4>
                    <p className="mb-4 text-on-surface-variant">{tx.service.nameEn}</p>
                    <ProgressBar value={tx.readinessScore ?? 0} />
                    <Link
                      to={`/transactions/${tx.referenceCode}/workspace`}
                      className="mt-3 inline-block font-label text-sm text-primary"
                    >
                      Open workspace →
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <Card>
              <div className="mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary-fixed-dim">
                  tips_and_updates
                </span>
                <h3 className="font-headline text-xl text-primary">
                  {t('dashboard.recommendations')}
                </h3>
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border-s-4 border-secondary-fixed-dim bg-surface-container p-4">
                  <p className="mb-2 text-primary">
                    {workspace.data?.nextAction?.label ??
                      'Review document readiness before sandbox submission.'}
                  </p>
                  <p className="mb-3 text-sm text-on-surface-variant">
                    {workspace.data?.nextAction?.reason ??
                      'Open the workspace to prepare your application.'}
                  </p>
                  {primary ? (
                    <Link
                      to={`/transactions/${primary.referenceCode}/workspace`}
                      className="font-label text-xs text-primary"
                    >
                      Open workspace →
                    </Link>
                  ) : null}
                </div>
                {(workspace.data?.insights ?? []).slice(0, 2).map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-lg border-s-4 border-outline bg-surface-container p-4"
                  >
                    <p className="font-medium text-primary">{insight.title}</p>
                    <p className="mt-1 text-sm text-on-surface-variant">{insight.summary}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
