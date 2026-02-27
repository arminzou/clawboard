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
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-150 ease-out disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--cb-accent)/0.70)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--cb-surface))] active:scale-[0.98]';

  const sizes: Record<Size, string> = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    icon: 'h-9 w-9 p-0',
  };

  const variants: Record<Variant, string> = {
    primary:
      'border border-transparent bg-[rgb(var(--cb-accent))] text-[rgb(var(--cb-on-accent))] shadow-sm hover:border-[rgb(var(--cb-surface)/0.90)] dark:hover:border-[rgb(var(--cb-on-accent)/0.34)] hover:brightness-105 hover:shadow disabled:border-transparent disabled:bg-[rgb(var(--cb-accent)/0.65)] disabled:text-[rgb(var(--cb-on-accent)/0.9)] disabled:shadow-none',
    secondary:
      'border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface-muted))] text-[rgb(var(--cb-text))] shadow-sm hover:bg-[rgb(var(--cb-accent-soft)/0.9)] hover:border-[rgb(var(--cb-accent)/0.28)] dark:hover:border-[rgb(var(--cb-accent-text)/0.45)] hover:shadow-md disabled:border-[rgb(var(--cb-border)/0.7)] disabled:bg-[rgb(var(--cb-surface-muted)/0.72)] disabled:text-[rgb(var(--cb-text-muted))] disabled:shadow-none',
    ghost:
      'text-[rgb(var(--cb-text))] hover:bg-[rgb(var(--cb-accent-soft)/0.95)] hover:text-[rgb(var(--cb-accent-text))] hover:shadow-sm dark:hover:bg-[rgb(var(--cb-accent-soft)/0.8)] disabled:text-[rgb(var(--cb-text-muted))]',
    danger:
      'border border-red-200 bg-red-50/60 text-red-700 shadow-sm hover:bg-red-100 hover:border-red-400 hover:shadow-md dark:border-red-500/45 dark:bg-red-500/18 dark:text-red-200 dark:hover:bg-red-500/28 dark:hover:border-red-400/70 disabled:border-red-300/60 disabled:bg-red-50/35 disabled:text-red-500/70 disabled:shadow-none',
    'ghost-danger':
      'text-red-600 hover:bg-red-100/85 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-500/22 dark:hover:text-red-100 disabled:text-red-400/80',
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
          : 'text-[rgb(var(--cb-surface)/0.82)] hover:bg-[rgb(var(--cb-surface)/0.22)] hover:shadow-sm hover:text-[rgb(var(--cb-surface))]',
        className,
      )}
    >
      {children}
    </button>
  );
}
