import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronUp, X } from 'lucide-react';
import { AgentArcadePanel } from './AgentArcadePanel';
import { AgentPresenceStrip } from './AgentPresenceStrip';
import { useAgentPresence } from './AgentPresenceContext';

const STORAGE_KEY = 'cb.mobile.agentSheetOpen';

export function AgentMobileDock() {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const { agentIds, presenceByAgent, wsStatus } = useAgentPresence();

  const summary = useMemo(() => {
    if (!agentIds.length) return 'No agents';
    const thinking = agentIds.filter((id) => (presenceByAgent[id]?.status ?? 'offline') === 'thinking').length;
    const online = agentIds.filter((id) => (presenceByAgent[id]?.status ?? 'offline') !== 'offline').length;
    if (thinking > 0) return `${thinking} thinking`;
    if (online > 0) return `${online} online`;
    if (wsStatus !== 'connected') return 'Connecting';
    return 'All offline';
  }, [agentIds, presenceByAgent, wsStatus]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <div className="min-w-0 border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur xl:hidden">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Agents</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen(true)}
            aria-label="Open agent list"
            aria-expanded={open}
          >
            <span>{summary}</span>
            <ChevronUp size={13} className={clsx('transition-transform', open ? 'rotate-180' : 'rotate-0')} />
          </button>
        </div>
        <AgentPresenceStrip horizontal className="pb-[calc(env(safe-area-inset-bottom)+0.125rem)]" />
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-label="Close agent list overlay"
          />

          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Agents</div>
                <div className="text-xs text-slate-600">{summary}</div>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setOpen(false)}
                aria-label="Close agent list"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
              <AgentArcadePanel hideHeader />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

