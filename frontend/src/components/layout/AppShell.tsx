import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react';
import { AgentArcadePanel } from './AgentArcadePanel';
import { AgentMobileDock } from './AgentMobileDock';
import { AgentPresenceStrip } from './AgentPresenceStrip';
import { AgentPresenceProvider } from './AgentPresenceContext';
import { AgentStateTestPanel } from './AgentStateTestPanel';
import type { WsStatus } from '../../hooks/useWebSocket';
import type { AgentProfileSources } from './agentProfile';

const AGENT_RAIL_SLIM_KEY = 'cb.agentRailSlim';

export function AppShell({
  sidebar,
  topbar,
  wsSignal,
  wsStatus,
  initialAgentIds,
  agentProfileSources,
  contentClassName,
  children,
}: {
  sidebar?: ReactNode;
  topbar?: ReactNode;
  wsSignal?: { type?: string; data?: unknown } | null;
  wsStatus?: WsStatus;
  initialAgentIds?: string[];
  agentProfileSources?: AgentProfileSources;
  contentClassName?: string;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [agentRailSlim, setAgentRailSlim] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(AGENT_RAIL_SLIM_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [layoutFlags, setLayoutFlags] = useState(() => {
    if (typeof window === 'undefined') {
      return { coarsePointer: false, desktopMin: true, wideMin: true };
    }
    return {
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
      desktopMin: window.matchMedia('(min-width: 900px)').matches,
      wideMin: window.matchMedia('(min-width: 1280px)').matches,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const coarseMedia = window.matchMedia('(pointer: coarse)');
    const desktopMedia = window.matchMedia('(min-width: 900px)');
    const wideMedia = window.matchMedia('(min-width: 1280px)');
    const onChange = () => {
      setLayoutFlags({
        coarsePointer: coarseMedia.matches,
        desktopMin: desktopMedia.matches,
        wideMin: wideMedia.matches,
      });
    };
    onChange();
    coarseMedia.addEventListener('change', onChange);
    desktopMedia.addEventListener('change', onChange);
    wideMedia.addEventListener('change', onChange);
    return () => {
      coarseMedia.removeEventListener('change', onChange);
      desktopMedia.removeEventListener('change', onChange);
      wideMedia.removeEventListener('change', onChange);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(AGENT_RAIL_SLIM_KEY, agentRailSlim ? '1' : '0');
    } catch {
      // ignore
    }
  }, [agentRailSlim]);

  // Use right-side panel on wide screens; use bottom bar + sheet on narrow screens.
  const showDesktopAgentRail = layoutFlags.wideMin;
  const compactDesktopRail = false;
  const showMobileDock = !layoutFlags.wideMin;

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
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div className={clsx('min-w-0 flex-1 overflow-auto px-4 pb-4 pt-4', contentClassName)}>{children}</div>

            {showDesktopAgentRail ? (
              <aside
                className={clsx(
                  'cb-scrollbar-hidden min-h-0 shrink-0 overflow-x-hidden overflow-y-auto border-l border-slate-200 bg-slate-100/60',
                  agentRailSlim ? 'w-[72px] p-2' : (compactDesktopRail ? 'w-[248px] p-2' : 'w-[320px] p-3'),
                )}
              >
                <div className={clsx('mb-2 flex', agentRailSlim ? 'justify-center' : 'justify-end')}>
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-50"
                    onClick={() => setAgentRailSlim((v) => !v)}
                    aria-label={agentRailSlim ? 'Expand agent panel' : 'Collapse agent panel'}
                    title={agentRailSlim ? 'Expand panel' : 'Collapse panel'}
                  >
                    {agentRailSlim ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
                  </button>
                </div>

                {agentRailSlim ? (
                  <AgentPresenceStrip className="h-[calc(100%-2rem)] pt-1" />
                ) : (
                  <AgentArcadePanel compact={compactDesktopRail} hideHeader={compactDesktopRail} />
                )}
              </aside>
            ) : null}
          </div>

          {showMobileDock ? <AgentMobileDock /> : null}
          <AgentStateTestPanel />
        </AgentPresenceProvider>
      </main>
    </div>
  );
}
