import { StatusBadge } from '@/components/ui/status-badge';

interface DocumentCardProps {
  title: string;
  status: 'valid' | 'warning' | 'missing' | 'invalid';
  actionLabel?: string;
  onAction?: () => void;
}

const statusMap = {
  valid: { tone: 'success' as const, icon: 'check_circle', label: 'Verified' },
  warning: { tone: 'warning' as const, icon: 'warning', label: 'Needs attention' },
  missing: { tone: 'error' as const, icon: 'error', label: 'Missing' },
  invalid: { tone: 'error' as const, icon: 'cancel', label: 'Invalid' },
};

export function DocumentCard({ title, status, actionLabel, onAction }: DocumentCardProps) {
  const meta = statusMap[status];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined ${status === 'valid' ? 'text-secondary' : 'text-error'}`}>
          {meta.icon}
        </span>
        <div>
          <h4 className="font-label text-sm font-semibold text-primary">{title}</h4>
          <div className="mt-1">
            <StatusBadge label={meta.label} tone={meta.tone} />
          </div>
        </div>
      </div>
      {actionLabel ? (
        <button type="button" onClick={onAction} className="font-label text-sm text-primary underline">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
