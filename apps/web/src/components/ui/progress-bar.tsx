interface ProgressBarProps {
  value: number;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ value, className = '', barClassName = 'bg-primary' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-surface-variant ${className}`}>
      <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
