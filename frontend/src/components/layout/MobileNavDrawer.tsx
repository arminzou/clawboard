import { useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Activity as ActivityIcon,
  Bell,
  CheckSquare,
  FileText,
  LayoutGrid,
  Menu,
  Moon,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import type { ResolvedTheme } from '../../hooks/useTheme';
import type { AppTab } from './IconRail';

export function MobileNavDrawer({
  tab,
  onTab,
  theme,
  onToggleTheme,
  showAttention,
}: {
  tab: AppTab;
  onTab: (t: AppTab) => void;
  theme: ResolvedTheme;
  onToggleTheme: () => void;
  showAttention?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const items = useMemo((): Array<{ key: AppTab; label: string; icon: ReactNode }> => {
    const base: Array<{ key: AppTab; label: string; icon: ReactNode }> = [
      ...(showAttention ? [{ key: 'attention' as const, label: 'Attention', icon: <Bell size={18} /> }] : []),
      { key: 'kanban', label: 'Projects', icon: <LayoutGrid size={18} /> },
      { key: 'inbox', label: 'Inbox', icon: <CheckSquare size={18} /> },
      { key: 'activity', label: 'Activity', icon: <ActivityIcon size={18} /> },
      { key: 'docs', label: 'Docs', icon: <FileText size={18} /> },
      { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
    ];
    return base;
  }, [showAttention]);

  return (
    <>
      {/* Hamburger trigger (mobile only). Kept out of layout flow so content gets full width. */}
      <button
        type="button"
        className={clsx(
          'fixed left-3 top-3 z-[60] inline-flex items-center justify-center rounded-xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] p-2 text-[rgb(var(--cb-text))] shadow-sm',
          'md:hidden',
        )}
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu size={18} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 w-[85vw] max-w-xs border-r border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgb(var(--cb-border))] p-4">
              <div className="text-sm font-semibold text-[rgb(var(--cb-text))]">Menu</div>
              <button
                type="button"
                className="rounded-lg p-2 text-[rgb(var(--cb-text-muted))] hover:bg-[rgb(var(--cb-hover))] hover:text-[rgb(var(--cb-text))]"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3">
              <nav className="space-y-1">
                {items.map((it) => (
                  <button
                    key={it.key}
                    type="button"
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm',
                      'min-h-[44px]',
                      tab === it.key
                        ? 'bg-[rgb(var(--cb-hover))] text-[rgb(var(--cb-text))]'
                        : 'text-[rgb(var(--cb-text-muted))] hover:bg-[rgb(var(--cb-hover))] hover:text-[rgb(var(--cb-text))]',
                    )}
                    onClick={() => {
                      onTab(it.key);
                      setOpen(false);
                    }}
                  >
                    <span className="shrink-0">{it.icon}</span>
                    <span className="font-medium">{it.label}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-3 border-t border-[rgb(var(--cb-border))] pt-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[rgb(var(--cb-text-muted))] hover:bg-[rgb(var(--cb-hover))] hover:text-[rgb(var(--cb-text))] min-h-[44px]"
                  onClick={() => {
                    onToggleTheme();
                  }}
                >
                  <span className="shrink-0">
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                  </span>
                  <span className="font-medium">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
