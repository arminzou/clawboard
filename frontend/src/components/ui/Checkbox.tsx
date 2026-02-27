import clsx from 'clsx';
import { Check } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Visual size variant */
  size?: 'sm' | 'md';
  /** Label text (optional, renders as sibling span) */
  label?: string;
  /** Optional class for label text span */
  labelClassName?: string;
}

/**
 * Styled checkbox matching the v2 design system.
 * Uses a hidden native input + custom visuals for accessibility.
 */
export function Checkbox({
  size = 'md',
  label,
  labelClassName,
  className,
  checked,
  disabled,
  ...rest
}: CheckboxProps) {
  const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <label
      className={clsx(
        'group inline-flex cursor-pointer items-center gap-2',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span className="relative">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...rest}
        />
        <span
          className={clsx(
            sizeClasses,
            'flex items-center justify-center rounded border transition-colors',
            'border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))]',
            'group-hover:border-[rgb(var(--cb-border)/0.95)] group-hover:bg-[rgb(var(--cb-surface-muted))]',
            'dark:group-hover:border-[rgb(var(--cb-accent-text)/0.9)] dark:group-hover:bg-[rgb(var(--cb-accent-text)/0.12)]',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[rgb(var(--cb-accent)/0.45)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[rgb(var(--cb-surface))]',
            'peer-checked:border-[rgb(var(--cb-accent))] peer-checked:bg-[rgb(var(--cb-accent))]',
            'peer-checked:group-hover:border-[rgb(var(--cb-accent))] peer-checked:group-hover:bg-[rgb(var(--cb-accent)/0.9)] peer-checked:group-hover:shadow-[0_0_0_1px_rgb(var(--cb-accent)/0.24)]',
            'dark:peer-checked:group-hover:shadow-[0_0_0_1px_rgb(var(--cb-accent-text)/0.45)]',
          )}
        >
          {checked ? (
            <Check size={iconSize} strokeWidth={3} className="text-white" />
          ) : null}
        </span>
      </span>
      {label ? (
        <span className={clsx('text-sm text-[rgb(var(--cb-text))]', labelClassName)}>{label}</span>
      ) : null}
    </label>
  );
}
