import type { ReactNode } from 'react';

interface AiInsightCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function AiInsightCard({ title, children, className = '' }: AiInsightCardProps) {
  return (
    <div className={`ai-insight-layer relative overflow-hidden rounded-xl p-6 shadow-tinted ${className}`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary-container to-tertiary-fixed-dim" />
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary-fixed-dim">auto_awesome</span>
        <h3 className="font-headline text-lg font-medium text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );
}
