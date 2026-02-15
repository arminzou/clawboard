import clsx from 'clsx';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type MenuItem =
  | {
      key: string;
      kind?: 'item';
      label: string;
      onSelect?: () => void;
      disabled?: boolean;
      icon?: ReactNode;
      checked?: boolean;
      description?: string;
    }
  | {
      key: string;
      kind: 'separator';
    }
  | {
      key: string;
      kind: 'label';
      label: string;
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
            'absolute z-50 mt-2 min-w-48 rounded-xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] p-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((it) => {
            if (it.kind === 'separator') {
              return <div key={it.key} className="my-1 h-px bg-[rgb(var(--cb-border))]" />;
            }

            if (it.kind === 'label') {
              return (
                <div key={it.key} className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--cb-text-muted))]">
                  {it.label}
                </div>
              );
            }

            return (
              <button
                key={it.key}
                type="button"
                role="menuitem"
                className={clsx(
                  'w-full rounded-lg px-2 py-2 text-left text-sm text-[rgb(var(--cb-text))] transition',
                  it.disabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-[rgb(var(--cb-accent-soft))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--cb-accent)/0.45)]',
                )}
                onClick={() => {
                  if (it.disabled) return;
                  setOpen(false);
                  it.onSelect?.();
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[rgb(var(--cb-accent))] text-xs font-bold">
                    {it.checked ? '✓' : null}
                  </span>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[rgb(var(--cb-text-muted))]">
                    {it.icon ?? null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{it.label}</span>
                    {it.description ? (
                      <span className="text-xs text-[rgb(var(--cb-text-muted))]">{it.description}</span>
                    ) : null}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
