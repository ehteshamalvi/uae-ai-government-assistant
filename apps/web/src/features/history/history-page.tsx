import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/states';
import { useTransactions } from '@/hooks/use-transactions';
import { useServices } from '@/hooks/use-services';

function hrefForStatus(referenceCode: string, status: string) {
  if (['SUBMITTED', 'PROCESSING', 'COMPLETED', 'ISSUED', 'APPROVED'].includes(status)) {
    return `/transactions/${referenceCode}/monitor`;
  }
  if (status === 'PAYMENT_PENDING') return `/transactions/${referenceCode}/payment`;
  if (status === 'READY_FOR_REVIEW' || status === 'UNDER_REVIEW') {
    return `/transactions/${referenceCode}/review`;
  }
  return `/transactions/${referenceCode}/workspace`;
}

export function HistoryPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceId, setServiceId] = useState('');
  const services = useServices();
  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      serviceId: serviceId || undefined,
    }),
    [search, status, serviceId],
  );
  const { data, isLoading, isError, error, refetch, isFetching } = useTransactions(query);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 font-display text-4xl text-primary">Transaction History</h1>
      <p className="mb-8 text-on-surface-variant">
        Search and filter live sandbox transactions. Click a row to open the right workspace.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <label className="sr-only" htmlFor="history-search">
            Search by title or reference
          </label>
          <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            id="history-search"
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2.5 pe-4 ps-10 outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Search title or TRX-…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="history-status">
            Status filter
          </label>
          <select
            id="history-status"
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY_FOR_REVIEW">Ready for review</option>
            <option value="PAYMENT_PENDING">Payment pending</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="ISSUED">Issued</option>
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="history-service">
            Service filter
          </label>
          <select
            id="history-service"
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">All services</option>
            {(services.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState
          title="Unable to load history"
          description={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && data?.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Try clearing filters or start from Search / Council Demo."
          action={
            <Link to="/demo">
              <Button>Open Council Demo</Button>
            </Link>
          }
        />
      ) : null}

      <div className={`space-y-4 ${isFetching ? 'opacity-70' : ''}`}>
        {data?.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-headline text-xl text-primary">{item.title}</h3>
                <p className="text-sm text-on-surface-variant">
                  {item.referenceCode} · {item.service.nameEn}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge label={item.status.replaceAll('_', ' ')} tone="ai" />
                  <StatusBadge
                    label={`Readiness ${item.readinessScore ?? '—'}%`}
                    tone="neutral"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={hrefForStatus(item.referenceCode, item.status)}>
                  <Button>Open</Button>
                </Link>
                <Link to={`/transactions/${item.referenceCode}/readiness`}>
                  <Button variant="secondary">Readiness</Button>
                </Link>
                <Link to={`/transactions/${item.referenceCode}/monitor`}>
                  <Button variant="secondary">Monitor</Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
