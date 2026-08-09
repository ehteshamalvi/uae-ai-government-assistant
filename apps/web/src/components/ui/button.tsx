import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'ai' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container',
  secondary: 'border border-primary text-primary hover:bg-surface-container-low',
  ghost: 'text-primary hover:bg-surface-container-low',
  ai: 'bg-gradient-to-r from-secondary-container to-tertiary-fixed-dim text-on-secondary-container font-bold hover:opacity-90',
  danger: 'border border-error-container text-error hover:bg-error-container',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-label text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
