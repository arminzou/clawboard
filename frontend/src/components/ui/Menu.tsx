import clsx from 'clsx';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type MenuItem = {
  key: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

export function Menu({
  trigger,
  items,
  align = 'right',
  className,
}: {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setOpen(false);
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [open]);

  function toggle() {
    setOpen((v) => !v);
  }

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      {trigger({ open, toggle })}

      {open ? (
        <div
          role="menu"
          aria-label="Menu"
          className={clsx(
            'absolute z-50 mt-2 min-w-44 rounded-xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] p-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              className={clsx(
                'w-full rounded-lg px-2 py-1.5 text-left text-sm text-[rgb(var(--cb-text))] transition',
                it.disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-[rgb(var(--cb-accent-soft))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--cb-accent)/0.45)]',
              )}
              onClick={() => {
                if (it.disabled) return;
                setOpen(false);
                it.onSelect();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
