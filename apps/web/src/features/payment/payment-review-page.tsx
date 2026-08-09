import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorState, LoadingState } from '@/components/ui/states';
import {
  useCreatePayment,
  usePayment,
  useProcessPayment,
  useSubmitTransaction,
} from '@/hooks/use-lifecycle';

function formatAed(n: number) {
  return `AED ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PaymentReviewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = usePayment(id);
  const createPay = useCreatePayment();
  const processPay = useProcessPayment();
  const submit = useSubmitTransaction();
  const [mode, setMode] = useState<'SUCCESS' | 'FAILURE'>('SUCCESS');
  const [phase, setPhase] = useState<'idle' | 'processing' | 'paid' | 'failed' | 'submitted'>(
    'idle',
  );
  const [submissionRef, setSubmissionRef] = useState<string | null>(null);
  const ensured = useRef(false);

  useEffect(() => {
    if (ensured.current || !data || data.payment) return;
    ensured.current = true;
    void createPay.mutateAsync(id).then(() => refetch()).catch(() => {
      ensured.current = false;
    });
  }, [data, id, createPay, refetch]);

  useEffect(() => {
    if (data?.statusLabel === 'PAID') setPhase('paid');
  }, [data?.statusLabel]);

  if (isLoading || createPay.isPending) {
    return <LoadingState label="Preparing sandbox payment…" />;
  }
  if (isError || !data) {
    return (
      <ErrorState
        title="Unable to load payment"
        description={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  const onPay = async () => {
    setPhase('processing');
    try {
      const result = await processPay.mutateAsync({ id, outcome: mode });
      if (result.outcome === 'FAILURE' || result.statusLabel === 'FAILED') {
        setPhase('failed');
      } else {
        setPhase('paid');
        await refetch();
      }
    } catch {
      setPhase('failed');
    }
  };

  const onSubmit = async () => {
    const result = await submit.mutateAsync(id);
    setSubmissionRef(result.submissionReference);
    setPhase('submitted');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <StatusBadge label="SANDBOX PAYMENT" tone="warning" />
        <h1 className="mt-3 font-headline text-3xl font-bold text-primary">Payment Review</h1>
        <p className="mt-2 text-on-surface-variant">
          Demo fee summary only. No real government payment is processed.
        </p>
        <p className="mt-1 text-xs text-outline">{data.referenceCode}</p>
      </div>

      <Card>
        <div className="space-y-3 text-sm">
          {data.feeBreakdown.map((line) => (
            <div key={line.code} className="flex justify-between">
              <span>{line.label}</span>
              <span className="font-medium">{formatAed(line.amountAed)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-outline-variant pt-3 text-base font-semibold text-primary">
            <span>Total Amount</span>
            <span>{formatAed(data.totalAmount)}</span>
          </div>
        </div>
      </Card>

      <Card ai>
        <p className="text-sm text-on-surface-variant">{data.disclaimer}</p>
        <p className="mt-2 text-xs text-outline">
          Tester tip: choose FAILURE below to demo a failed payment without real infrastructure.
        </p>
        <div className="mt-3 flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="outcome"
              checked={mode === 'SUCCESS'}
              onChange={() => setMode('SUCCESS')}
            />
            SUCCESS
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="outcome"
              checked={mode === 'FAILURE'}
              onChange={() => setMode('FAILURE')}
            />
            FAILURE
          </label>
        </div>
      </Card>

      {phase === 'processing' ? <LoadingState label="Processing sandbox payment…" /> : null}
      {phase === 'paid' ? (
        <Card>
          <p className="font-medium text-secondary">Payment Successful (Sandbox)</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            No real money was charged. You may submit the sandbox application.
          </p>
        </Card>
      ) : null}
      {phase === 'failed' ? (
        <Card>
          <p className="font-medium text-error">Payment Failed (Sandbox Demo)</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Switch to SUCCESS and retry. No real charge occurred.
          </p>
        </Card>
      ) : null}
      {phase === 'submitted' ? (
        <Card>
          <p className="font-medium text-secondary">Sandbox Submission Complete</p>
          <p className="mt-1 text-sm">Reference: {submissionRef}</p>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to={`/transactions/${data.referenceCode}/review`} className="flex-1">
          <Button variant="secondary" className="w-full">
            Back
          </Button>
        </Link>
        {phase !== 'paid' && phase !== 'submitted' ? (
          <Button
            className="flex-1"
            disabled={processPay.isPending || phase === 'processing'}
            onClick={() => void onPay()}
          >
            Pay {formatAed(data.totalAmount)} (Sandbox)
          </Button>
        ) : null}
        {phase === 'paid' ? (
          <Button
            className="flex-1"
            disabled={submit.isPending}
            onClick={() => void onSubmit()}
          >
            {submit.isPending ? 'Submitting…' : 'Submit Application (Sandbox)'}
          </Button>
        ) : null}
        {phase === 'submitted' ? (
          <Button
            className="flex-1"
            onClick={() => navigate(`/transactions/${data.referenceCode}/monitor`)}
          >
            Open Monitor
          </Button>
        ) : null}
      </div>
    </div>
  );
}
