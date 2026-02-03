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
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--cb-accent)/0.70)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--cb-surface))]';

  const sizes: Record<Size, string> = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
  };

  const variants: Record<Variant, string> = {
    primary:
      'bg-[rgb(var(--cb-accent))] text-[rgb(var(--cb-surface))] shadow-sm hover:bg-[rgb(var(--cb-accent)/0.92)]',
    secondary:
      'border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] text-[rgb(var(--cb-text))] shadow-sm hover:bg-[rgb(var(--cb-surface-muted))]',
    ghost: 'text-[rgb(var(--cb-text))] hover:bg-[rgb(var(--cb-accent-soft))]',
    danger:
      'border border-red-200 bg-[rgb(var(--cb-surface))] text-red-700 shadow-sm hover:bg-red-50',
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--cb-surface)/0.70)]',
        active
          ? 'bg-[rgb(var(--cb-surface))] text-[rgb(var(--cb-accent))]'
          : 'text-[rgb(var(--cb-surface)/0.82)] hover:bg-[rgb(var(--cb-surface)/0.12)] hover:text-[rgb(var(--cb-surface))]',
        className,
      )}
    >
      {children}
    </button>
  );
}
