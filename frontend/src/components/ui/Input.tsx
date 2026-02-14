import clsx from 'clsx';
import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      className={clsx('cb-input', 'w-full min-w-0', className)}
    />
  );
});
