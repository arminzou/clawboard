import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export function Button({
  variant = 'secondary',
  size = 'md',
  left,
  right,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:pointer-events-none disabled:opacity-50';

  const sizes: Record<Size, string> = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
  };

  const variants: Record<Variant, string> = {
    primary: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
    secondary: 'border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50',
    ghost: 'text-slate-800 hover:bg-slate-100',
    danger: 'border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50',
  };

  return (
    <button
      {...props}
      className={clsx(base, sizes[size], variants[variant], className)}
      type={props.type ?? 'button'}
    >
      {left ? <span className="-ml-0.5">{left}</span> : null}
      {props.children}
      {right ? <span className="-mr-0.5">{right}</span> : null}
    </button>
  );
}

export function IconButton({
  label,
  active,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      title={label}
      aria-label={label}
      className={clsx(
        'inline-flex h-10 w-10 items-center justify-center rounded-2xl transition disabled:pointer-events-none disabled:opacity-50',
        active ? 'bg-white text-slate-950' : 'text-white/80 hover:bg-white/10 hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  );
}
