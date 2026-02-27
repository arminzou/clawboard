import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'neutral' | 'strong' | 'soft';

export function Chip({
  variant = 'soft',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant; children?: ReactNode }) {
  const variants: Record<Variant, string> = {
    soft: 'bg-[rgb(var(--cb-accent-soft))] text-[rgb(var(--cb-text))]',
    neutral:
      'border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] text-[rgb(var(--cb-text))]',
    strong: 'bg-[rgb(var(--cb-accent))] text-[rgb(var(--cb-on-accent))]',
  };

  return (
    <span
      {...props}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
