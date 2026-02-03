import clsx from 'clsx';
import type { InputHTMLAttributes } from 'react';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400',
        'focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        className,
      )}
    />
  );
}
