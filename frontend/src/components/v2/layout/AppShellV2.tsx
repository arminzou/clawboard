import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Menu, X } from 'lucide-react';

export function AppShellV2({
  sidebar,
  topbar,
  children,
}: {
  sidebar?: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-full">
      {/* Mobile Drawer Overlay */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden',
          mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar Container */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 transform bg-white transition-transform lg:static lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile Close Button */}
          <div className="flex justify-end p-2 lg:hidden">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{sidebar}</div>
        </div>
      </div>

      <main className="min-w-0 flex flex-1 flex-col bg-[rgb(var(--cb-surface-muted))]">
        {/* Mobile Header Toggle */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Menu</span>
        </div>

        {topbar}
        <div className="flex-1 overflow-auto px-4 py-4">{children}</div>
      </main>
    </div>
  );
}
