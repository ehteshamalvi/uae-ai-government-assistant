interface ReadinessScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ReadinessScore({ score, size = 'md' }: ReadinessScoreProps) {
  const dims = size === 'lg' ? 'h-32 w-32' : size === 'sm' ? 'h-20 w-20' : 'h-24 w-24';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center ${dims}`}>
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-surface-container"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
        />
        <circle
          className="text-secondary-fixed-dim"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="font-headline text-2xl font-semibold text-primary">{score}%</span>
    </div>
  );
}
