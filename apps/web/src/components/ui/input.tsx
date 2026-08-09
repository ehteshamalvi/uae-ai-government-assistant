import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="flex w-full flex-col gap-2">
      {label ? (
        <span className="font-label text-xs font-semibold uppercase tracking-wide text-primary">
          {label}
        </span>
      ) : null}
      <input
        id={inputId}
        className={`w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition focus:border-primary ${className}`}
        {...props}
      />
    </label>
  );
}
