import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  ai?: boolean;
}

export function Card({ children, className = '', ai = false }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-tinted ${
        ai ? 'ai-insight-layer ai-border-top' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
