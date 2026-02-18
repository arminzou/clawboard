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
  menuClassName,
  density = 'default',
}: {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  className?: string;
  menuClassName?: string;
  density?: 'default' | 'compact';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hasIcons = items.some((it) => 'icon' in it && Boolean(it.icon));
  const itemGapClass = density === 'compact'
    ? hasIcons
      ? 'gap-1.5'
      : 'gap-1'
    : hasIcons
      ? 'gap-2'
      : 'gap-1.5';
  const checkmarkClass = clsx(
    'flex h-4 w-4 shrink-0 items-center justify-center text-[rgb(var(--cb-accent))] text-xs font-bold',
    !hasIcons && 'mr-1',
  );

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
            'absolute z-50 mt-2 min-w-48 cb-menu',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {items.map((it) => {
            if (it.kind === 'separator') {
              return <div key={it.key} className="cb-menu-separator" />;
            }

            if (it.kind === 'label') {
              return (
                <div key={it.key} className="cb-menu-section-label">
                  {it.label}
                </div>
              );
            }

            return (
              <button
                key={it.key}
                type="button"
                role="menuitem"
                title={it.label}
                className={clsx(
                  'w-full text-left cb-menu-item',
                  it.disabled
                    ? 'cursor-not-allowed opacity-60 pointer-events-none'
                    : 'focus-visible:outline-none',
                )}
                onClick={() => {
                  if (it.disabled) return;
                  it.onSelect?.();
                  // Defer close to ensure state update completes first
                  setTimeout(() => setOpen(false), 0);
                }}
              >
                <div className={clsx('flex items-center', itemGapClass)}>
                  <span className={checkmarkClass}>
                    {it.checked ? '✓' : null}
                  </span>
                  {hasIcons ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[rgb(var(--cb-text-muted))]">
                      {it.icon ?? null}
                    </span>
                  ) : null}
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
