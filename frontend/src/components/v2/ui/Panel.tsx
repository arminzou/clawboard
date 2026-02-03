import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export function Panel({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div {...props} className={clsx('cb-panel', className)}>
      {children}
    </div>
  );
}
