import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentCard } from '@/components/ai/document-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ReadinessScore } from '@/components/ui/readiness-score';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useReadiness } from '@/hooks/use-transactions';
import { useParams } from 'react-router-dom';

function mapEvalStatus(status: string): 'valid' | 'warning' | 'missing' | 'invalid' {
  if (status === 'COMPLETE') return 'valid';
  if (status === 'WARNING') return 'warning';
  if (status === 'BLOCKED') return 'invalid';
  return 'missing';
}

export function ReadinessPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error, refetch } = useReadiness(id);
  const [whyOpen, setWhyOpen] = useState(true);

  const documentEvals = useMemo(
    () => data?.evaluations.filter((e) => e.type === 'DOCUMENT') ?? [],
    [data],
  );

  if (isLoading) return <LoadingState label="Calculating readiness…" />;
  if (isError || !data) {
    return (
      <ErrorState
        title="Unable to load readiness"
        description={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="mb-8">
        <p className="mb-2 font-label text-sm uppercase tracking-wider text-on-surface-variant">
          Process Intelligence · {data.referenceCode}
        </p>
        <h1 className="font-display text-4xl font-semibold text-primary md:text-5xl">
          Transaction Readiness
        </h1>
        <p className="mt-2 text-on-surface-variant">Status: {data.status.replaceAll('_', ' ')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="relative overflow-hidden lg:col-span-8">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-secondary-fixed" />
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary-fixed-dim">analytics</span>
                <h2 className="font-headline text-2xl text-primary">AI Readiness Score</h2>
              </div>
              <p className="max-w-lg text-on-surface-variant">
                Calculated from documents, information completeness, and validation health.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-on-surface-variant md:grid-cols-3">
                <div>
                  Documents: {data.breakdown.documents.completed}/
                  {data.breakdown.documents.required} ({data.breakdown.documents.score}%)
                </div>
                <div>
                  Information: {data.breakdown.information.completed}/
                  {data.breakdown.information.required} ({data.breakdown.information.score}%)
                </div>
                <div>Validation: {data.breakdown.validation.score}%</div>
              </div>
            </div>
            <ReadinessScore score={data.score} size="lg" />
          </div>

          <button
            type="button"
            className="mt-6 flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-start"
            onClick={() => setWhyOpen((v) => !v)}
          >
            <span className="font-label text-sm font-semibold text-primary">Why this score?</span>
            <span className="material-symbols-outlined text-outline">
              {whyOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {whyOpen ? (
            <div className="mt-3 space-y-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-sm text-on-surface">
              <div className="flex justify-between">
                <span>Documents</span>
                <span>
                  {data.breakdown.documents.completed} / {data.breakdown.documents.required}{' '}
                  complete
                </span>
              </div>
              <div className="flex justify-between">
                <span>Information</span>
                <span>
                  {data.breakdown.information.completed} / {data.breakdown.information.required}{' '}
                  complete
                </span>
              </div>
              <div className="flex justify-between">
                <span>Validation</span>
                <span>{data.breakdown.validation.score}%</span>
              </div>
              <div className="flex justify-between">
                <span>Potential issues</span>
                <span>{data.issues.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Missing requirements</span>
                <span>{data.missingRequirements.length}</span>
              </div>
              <p className="pt-2 text-xs text-on-surface-variant">
                Weights — documents {Math.round(data.weights.DOCUMENT_WEIGHT * 100)}%, fields{' '}
                {Math.round(data.weights.FIELD_WEIGHT * 100)}%, validation{' '}
                {Math.round(data.weights.VALIDATION_WEIGHT * 100)}%
              </p>
            </div>
          ) : null}
        </Card>

        <div className="flex flex-col justify-between rounded-xl bg-primary-container p-6 text-on-primary-container lg:col-span-4">
          <div>
            <h3 className="mb-2 font-headline text-2xl text-on-primary">Next Steps</h3>
            <ul className="mb-6 space-y-2 text-sm opacity-90">
              {data.recommendations.slice(0, 3).map((rec) => (
                <li key={rec}>• {rec}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              to={`/copilot?transactionId=${encodeURIComponent(data.referenceCode)}&draft=${encodeURIComponent('Why is my transaction readiness score what it is?')}`}
            >
              <Button variant="ai" className="w-full">
                <span className="material-symbols-outlined">psychology</span>
                Explain with AI
              </Button>
            </Link>
            <Link to={`/transactions/${data.referenceCode}/workspace`}>
              <Button variant="secondary" className="w-full border-outline text-on-primary">
                Continue
                <span className="material-symbols-outlined">arrow_forward</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-7">
          <h3 className="mt-4 font-headline text-2xl text-primary">Required Documents</h3>
          {documentEvals.length === 0 ? (
            <p className="text-on-surface-variant">No document requirements for this service.</p>
          ) : (
            documentEvals.map((item) => (
              <div key={item.code} className="space-y-2">
                <DocumentCard
                  title={item.labelEn}
                  status={mapEvalStatus(item.status)}
                  actionLabel={
                    item.status === 'MISSING' || item.status === 'WARNING' ? 'Upload' : 'View'
                  }
                />
                {item.relatedDocumentId ? (
                  <Link
                    to={`/copilot?transactionId=${encodeURIComponent(data.referenceCode)}&documentId=${encodeURIComponent(item.relatedDocumentId)}&draft=${encodeURIComponent('Is my Emirates ID okay? Are my documents ready?')}`}
                    className="inline-block font-label text-xs text-primary"
                  >
                    Ask AI about this document →
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </div>

        <Card className="lg:col-span-5" ai>
          <h3 className="mb-3 font-headline text-xl text-primary">Issues & Missing</h3>
          {data.issues.length === 0 && data.missingRequirements.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No open issues.</p>
          ) : (
            <ul className="space-y-2 text-sm text-primary">
              {data.issues.map((issue) => (
                <li key={`${issue.code}-${issue.message}`}>
                  • [{issue.severity}] {issue.message}
                </li>
              ))}
              {data.missingRequirements.map((m) => (
                <li key={m.code}>
                  • Missing: {m.labelEn}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
