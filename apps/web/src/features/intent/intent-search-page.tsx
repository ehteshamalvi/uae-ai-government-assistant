import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiInsightCard } from '@/components/ai/ai-insight-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/states';
import { useTranslation } from '@/i18n';
import { useLocaleStore } from '@/stores/locale-store';
import { useAnalyzeIntent, useCreateTransaction } from '@/hooks/use-intent';
import type { IntentAnalyzeResponse } from '@/services/intent-api';

function bandTone(band: string): 'success' | 'warning' | 'error' | 'ai' {
  if (band === 'HIGH') return 'success';
  if (band === 'MEDIUM') return 'warning';
  return 'error';
}

export function IntentSearchPage() {
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useTranslation(locale);
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<IntentAnalyzeResponse | null>(null);
  const analyze = useAnalyzeIntent();
  const createTx = useCreateTransaction();

  const onAnalyze = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setResult(null);
    try {
      const data = await analyze.mutateAsync(trimmed);
      setResult(data);
    } catch {
      /* error surfaced via mutation */
    }
  };

  const startTransaction = async (serviceId: string, confidence?: number) => {
    const created = await createTx.mutateAsync({
      serviceId,
      intentText: message.trim(),
      confidence,
    });
    navigate(`/transactions/${created.referenceCode}/workspace`);
  };

  const canAutoStart =
    result?.serviceCandidate &&
    result.confidenceBand === 'HIGH' &&
    result.suggestedNextAction === 'START_TRANSACTION';

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <section className="space-y-6 text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight text-primary md:text-5xl">
          {t('search.title')}
        </h2>
        <div className="relative">
          <input
            className="w-full rounded-lg border-b border-outline bg-surface-container-lowest px-6 py-5 font-body text-lg text-primary shadow-sm outline-none focus:border-primary-container"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onAnalyze();
            }}
            placeholder={t('search.placeholder')}
          />
          <button
            type="button"
            className="absolute end-4 top-1/2 -translate-y-1/2 text-secondary"
            onClick={() => void onAnalyze()}
            aria-label="Analyze intent"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => void onAnalyze()} disabled={!message.trim() || analyze.isPending}>
            Analyze request
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setMessage('I want to renew my trade license');
            }}
          >
            Demo phrase
          </Button>
        </div>
      </section>

      {analyze.isPending ? <LoadingState label="Understanding request…" /> : null}

      {analyze.isError ? (
        <ErrorState
          title="Unable to analyze intent"
          description={
            analyze.error instanceof Error ? analyze.error.message : undefined
          }
          onRetry={() => void onAnalyze()}
        />
      ) : null}

      {!analyze.isPending && !analyze.isError && result && !result.serviceCandidate ? (
        <EmptyState
          title="No confident match"
          description="Try describing the service more clearly, or browse the catalog."
        />
      ) : null}

      {result?.serviceCandidate && result.confidenceBand !== 'LOW' ? (
        <AiInsightCard title={t('search.intentAnalysis')}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge label={result.confidenceBand} tone={bandTone(result.confidenceBand)} />
            <StatusBadge
              label={`${Math.round(result.confidence * 100)}% confidence`}
              tone="ai"
            />
            <StatusBadge label="AI Intent Analysis" tone="info" />
          </div>
          <h3 className="font-headline text-2xl text-primary">
            {locale === 'ar'
              ? result.serviceCandidate.nameAr
              : result.serviceCandidate.nameEn}
          </h3>
          <p className="mt-2 text-on-surface-variant">{result.interpretedRequest}</p>

          <div className="mt-4 rounded-lg bg-surface-container p-4 text-start">
            <p className="mb-2 font-label text-xs uppercase tracking-wider text-on-surface-variant">
              Detected information
            </p>
            <ul className="space-y-1 text-sm text-primary">
              <li>Company: {result.entities.companyName ?? '—'}</li>
              <li>License: {result.entities.licenseNumber ?? '—'}</li>
              <li>Expiry: {result.entities.expiryDate ?? '—'}</li>
            </ul>
          </div>

          <p className="mt-4 text-sm text-on-surface-variant">
            Recommended next step:{' '}
            <span className="font-medium text-primary">
              {result.suggestedNextAction.replaceAll('_', ' ')}
            </span>
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {canAutoStart || result.confidenceBand === 'MEDIUM' ? (
              <Button
                disabled={createTx.isPending}
                onClick={() =>
                  void startTransaction(
                    result.serviceCandidate!.id,
                    result.confidence,
                  )
                }
              >
                {createTx.isPending ? 'Creating…' : 'Start Transaction'}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setMessage('');
              }}
            >
              Clear result
            </Button>
          </div>
          {createTx.isError ? (
            <p className="mt-3 text-sm text-error">
              {createTx.error instanceof Error
                ? createTx.error.message
                : 'Failed to create transaction'}
            </p>
          ) : null}
        </AiInsightCard>
      ) : null}

      {result && result.confidenceBand === 'LOW' ? (
        <Card className="text-start">
          <h3 className="mb-2 font-headline text-xl text-primary">Possible matches</h3>
          <p className="mb-4 text-sm text-on-surface-variant">
            Confidence is low. Choose a service to continue — a transaction will not be created
            automatically.
          </p>
          <div className="space-y-3">
            {[
              ...(result.serviceCandidate
                ? [
                    {
                      id: result.serviceCandidate.id,
                      nameEn: result.serviceCandidate.nameEn,
                      nameAr: result.serviceCandidate.nameAr,
                      confidence: result.confidence,
                    },
                  ]
                : []),
              ...result.alternatives,
            ].map((alt) => (
              <div
                key={alt.id}
                className="flex flex-col gap-2 rounded-lg border border-outline-variant/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-primary">
                    {locale === 'ar' && 'nameAr' in alt ? alt.nameAr : alt.nameEn}
                  </p>
                  <p className="text-xs text-outline">
                    {Math.round(alt.confidence * 100)}% confidence
                  </p>
                </div>
                <Button
                  variant="secondary"
                  disabled={createTx.isPending}
                  onClick={() => void startTransaction(alt.id, alt.confidence)}
                >
                  Choose
                </Button>
              </div>
            ))}
            {result.alternatives.length === 0 && !result.serviceCandidate ? (
              <EmptyState title="No catalog matches" description="Try another phrase." />
            ) : null}
          </div>
        </Card>
      ) : null}

      {result && result.alternatives.length > 0 && result.confidenceBand !== 'LOW' ? (
        <Card className="text-start">
          <h4 className="mb-3 font-headline text-lg text-primary">Alternatives</h4>
          <ul className="space-y-2 text-sm text-on-surface-variant">
            {result.alternatives.map((alt) => (
              <li key={alt.id} className="flex justify-between gap-4">
                <span>{alt.nameEn}</span>
                <span>{Math.round(alt.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
