import clsx from 'clsx';
import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      {...props}
      ref={ref}
      className={clsx(
        'cb-input',
        'cb-select',
        'w-full min-w-0 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em]',
        className,
      )}
    >
      {children}
    </select>
  );
});
