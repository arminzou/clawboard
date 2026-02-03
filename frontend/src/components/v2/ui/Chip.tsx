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
    soft: 'bg-slate-100 text-slate-700',
    neutral: 'border border-slate-200 bg-white text-slate-700',
    strong: 'bg-slate-900 text-white',
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
