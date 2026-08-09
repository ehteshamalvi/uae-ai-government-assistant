import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useConfirmReview, useReview } from '@/hooks/use-lifecycle';

export function FinalReviewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useReview(id);
  const confirm = useConfirmReview();
  const [acknowledged, setAcknowledged] = useState(false);

  if (isLoading) return <LoadingState label="Loading final review…" />;
  if (isError || !data) {
    return (
      <ErrorState
        title="Unable to load review"
        description={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  const canContinue =
    data.canProceedToPayment &&
    (data.reviewConfirmedAt || acknowledged) &&
    !confirm.isPending;

  const onConfirmAndPay = async () => {
    if (!data.reviewConfirmedAt) {
      if (!acknowledged) return;
      await confirm.mutateAsync(id);
    }
    navigate(`/transactions/${data.referenceCode}/payment`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="SANDBOX DEMO" tone="ai" />
          <StatusBadge label={data.referenceCode} tone="neutral" />
          <StatusBadge
            label={data.eligibility.replaceAll('_', ' ')}
            tone={
              data.eligibility === 'READY_FOR_REVIEW'
                ? 'success'
                : data.eligibility === 'BLOCKED'
                  ? 'error'
                  : 'warning'
            }
          />
        </div>
        <h1 className="mt-3 font-headline text-3xl font-bold text-primary">Final Review</h1>
        <p className="mt-2 text-on-surface-variant">
          Review the prepared {data.service.nameEn} application before payment and sandbox
          submission.
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">{data.disclaimer}</p>
      </div>

      <Card ai>
        <h2 className="mb-2 font-headline text-xl text-primary">Review Summary</h2>
        <p className="text-on-surface">
          Readiness {data.readiness.score}% ({data.readiness.status.replaceAll('_', ' ')}).{' '}
          {data.warnings.length > 0
            ? `${data.warnings.length} warning(s) — may continue if not blocking.`
            : 'No warnings.'}
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          Applicant: {data.applicant.fullName} · {data.applicant.email}
        </p>
      </Card>

      <Card>
        <h3 className="mb-3 font-headline text-lg text-primary">Application information</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.fields.map((f) => (
            <div key={f.code}>
              <p className="font-label text-xs uppercase text-on-surface-variant">{f.labelEn}</p>
              <p className="font-medium text-primary">{f.value ?? '—'}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-headline text-lg text-primary">Documents</h3>
        <ul className="space-y-2 text-sm">
          {data.documents.map((d) => (
            <li key={d.id} className="flex justify-between gap-4">
              <span>{d.documentType ?? d.fileName}</span>
              <StatusBadge label={d.status} tone="neutral" />
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="mb-4 font-headline text-lg text-primary">Checklist</h3>
        <ul className="space-y-2 text-sm text-on-surface">
          {data.checklist.map((item) => (
            <li key={item.code} className="flex items-start justify-between gap-4">
              <span>
                {item.status === 'COMPLETE' || item.status === 'NOT_REQUIRED'
                  ? '✓'
                  : item.status === 'WARNING'
                    ? '⚠'
                    : item.status === 'BLOCKED'
                      ? '✗'
                      : '○'}{' '}
                {item.label}
                <span className="mt-0.5 block text-on-surface-variant">{item.description}</span>
              </span>
              {item.blocking ? <StatusBadge label="Blocking" tone="error" /> : null}
            </li>
          ))}
        </ul>
      </Card>

      {data.warnings.length > 0 ? (
        <Card>
          <h3 className="mb-2 font-headline text-lg text-primary">Warnings</h3>
          <ul className="space-y-1 text-sm text-on-surface-variant">
            {data.warnings.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.blockingIssues.length > 0 ? (
        <Card>
          <h3 className="mb-2 font-headline text-lg text-error">Blocking issues</h3>
          <ul className="space-y-1 text-sm">
            {data.blockingIssues.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.canProceedToPayment && !data.reviewConfirmedAt ? (
        <label className="flex items-start gap-3 rounded-lg bg-surface-container p-4 text-sm text-on-surface">
          <input
            type="checkbox"
            className="mt-1"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>
            I have reviewed the information and documents provided for this sandbox transaction.
            <span className="mt-1 block text-on-surface-variant">
              This is not legal consent — demo confirmation only.
            </span>
          </span>
        </label>
      ) : null}

      {data.reviewConfirmedAt ? (
        <p className="text-sm text-secondary">
          Review confirmed at {new Date(data.reviewConfirmedAt).toLocaleString()}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to={`/transactions/${data.referenceCode}/workspace`} className="flex-1">
          <Button variant="secondary" className="w-full">
            Back to Workspace
          </Button>
        </Link>
        <Button
          className="flex-1"
          disabled={!canContinue || !data.canProceedToPayment}
          onClick={() => void onConfirmAndPay()}
        >
          {confirm.isPending ? 'Confirming…' : 'Continue to Payment'}
        </Button>
      </div>
      {confirm.isError ? (
        <p className="text-sm text-error">
          {confirm.error instanceof Error ? confirm.error.message : 'Confirm failed'}
        </p>
      ) : null}
    </div>
  );
}
