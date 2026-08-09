type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'ai';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-container-high text-primary',
  success: 'bg-secondary-fixed/40 text-on-secondary-fixed-variant',
  warning: 'bg-error-container/60 text-on-error-container',
  error: 'bg-error-container text-error',
  info: 'bg-primary-fixed text-on-primary-fixed-variant',
  ai: 'bg-secondary-container/30 text-on-secondary-container',
};

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
