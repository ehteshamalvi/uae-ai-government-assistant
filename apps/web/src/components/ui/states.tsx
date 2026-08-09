import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-12 text-center">
      <span className="material-symbols-outlined mb-3 text-4xl text-outline">inbox</span>
      <h3 className="font-headline text-lg font-medium text-primary">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-on-surface-variant">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-6 py-10 text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin">progress_activity</span>
      <span className="font-label text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-error-container bg-error-container/30 px-6 py-8 text-center">
      <span className="material-symbols-outlined text-3xl text-error">error</span>
      <h3 className="mt-2 font-headline text-lg text-error">{title}</h3>
      {description ? <p className="mt-1 text-sm text-on-error-container">{description}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-error px-4 py-2 text-sm text-error"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
