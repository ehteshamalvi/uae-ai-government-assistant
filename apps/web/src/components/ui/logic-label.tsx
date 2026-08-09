import type { ReactNode } from 'react';

type LogicKind = 'ai' | 'deterministic' | 'sandbox';

const STYLES: Record<LogicKind, string> = {
  ai: 'bg-secondary-fixed/25 text-on-secondary-fixed-variant border-secondary-fixed/50',
  deterministic:
    'bg-primary-container/40 text-on-primary-container border-primary/30',
  sandbox: 'bg-tertiary-fixed/30 text-on-tertiary-fixed-variant border-tertiary/40',
};

const LABELS: Record<LogicKind, string> = {
  ai: 'AI INSIGHT',
  deterministic: 'DETERMINISTIC CHECK',
  sandbox: 'SANDBOX ACTION',
};

export function LogicLabel({ kind }: { kind: LogicKind }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider ${STYLES[kind]}`}
    >
      {LABELS[kind]}
    </span>
  );
}

export function LabeledInsight({
  kind,
  children,
  className = '',
}: {
  kind: LogicKind;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <LogicLabel kind={kind} />
      <div className="text-sm text-on-surface-variant">{children}</div>
    </div>
  );
}
