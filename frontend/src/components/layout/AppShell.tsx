import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Menu, X } from 'lucide-react';
import { AgentArcadePanel } from './AgentArcadePanel';
import { AgentMobileDock } from './AgentMobileDock';
import { AgentPresenceProvider } from './AgentPresenceContext';
import type { WsStatus } from '../../hooks/useWebSocket';
import type { AgentProfileSources } from './agentProfile';

export function AppShell({
  sidebar,
  topbar,
  wsSignal,
  wsStatus,
  initialAgentIds,
  agentProfileSources,
  children,
}: {
  sidebar?: ReactNode;
  topbar?: ReactNode;
  wsSignal?: { type?: string; data?: unknown } | null;
  wsStatus?: WsStatus;
  initialAgentIds?: string[];
  agentProfileSources?: AgentProfileSources;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileDock, setShowMobileDock] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.matchMedia('(min-width: 1280px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1280px)');
    const onChange = () => setShowMobileDock(!media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

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
          <div className="flex-1 overflow-y-auto cb-scrollbar-hidden">{sidebar}</div>
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

        <AgentPresenceProvider
          wsSignal={wsSignal}
          wsStatus={wsStatus}
          initialAgentIds={initialAgentIds}
          profileSources={agentProfileSources}
        >
          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1 overflow-auto px-4 pb-4 pt-4">{children}</div>

            <aside className="hidden w-[320px] shrink-0 border-l border-slate-200 bg-slate-100/60 p-3 xl:block">
              <AgentArcadePanel />
            </aside>
          </div>

          {showMobileDock ? <AgentMobileDock /> : null}
        </AgentPresenceProvider>
      </main>
    </div>
  );
}
