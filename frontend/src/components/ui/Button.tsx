import clsx from 'clsx';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ghost-danger';
type Size = 'sm' | 'md' | 'icon';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    left?: ReactNode;
    right?: ReactNode;
  }
>(function Button(
  { variant = 'secondary', size = 'md', left, right, className, ...props },
  ref,
) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--cb-accent)/0.70)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--cb-surface))] active:scale-[0.98]';

  const sizes: Record<Size, string> = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    icon: 'h-9 w-9 p-0',
  };

  const variants: Record<Variant, string> = {
    primary:
      'bg-[rgb(var(--cb-accent))] text-[rgb(var(--cb-on-accent))] shadow-sm hover:bg-[rgb(var(--cb-accent)/0.92)] disabled:bg-[rgb(var(--cb-accent)/0.65)] disabled:text-[rgb(var(--cb-on-accent)/0.9)] disabled:shadow-none',
    secondary:
      'border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface-muted))] text-[rgb(var(--cb-text))] shadow-sm hover:bg-[rgb(var(--cb-border)/0.5)] disabled:border-[rgb(var(--cb-border)/0.7)] disabled:bg-[rgb(var(--cb-surface-muted)/0.72)] disabled:text-[rgb(var(--cb-text-muted))] disabled:shadow-none',
    ghost: 'text-[rgb(var(--cb-text))] hover:bg-[rgb(var(--cb-accent-soft))] disabled:text-[rgb(var(--cb-text-muted))]',
    danger:
      'border border-red-200 bg-red-50/50 text-red-700 shadow-sm hover:bg-red-50 hover:border-red-300 disabled:border-red-300/60 disabled:bg-red-50/35 disabled:text-red-500/70 disabled:shadow-none',
    'ghost-danger': 'text-red-600 hover:bg-red-50 disabled:text-red-400/80',
  };

  return (
    <button
      {...props}
      ref={ref}
      className={clsx(base, sizes[size], variants[variant], className)}
      type={props.type ?? 'button'}
    >
      {left ? <span className="-ml-0.5">{left}</span> : null}
      {props.children}
      {right ? <span className="-mr-0.5">{right}</span> : null}
    </button>
  );
});

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
        'inline-flex h-10 w-10 items-center justify-center rounded-2xl transition disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
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
