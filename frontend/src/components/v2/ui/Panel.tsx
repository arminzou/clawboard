import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export function Panel({
  title,
  right,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title?: string;
  right?: ReactNode;
}) {
  return (
    <div {...props} className={clsx('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      {title ? (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
