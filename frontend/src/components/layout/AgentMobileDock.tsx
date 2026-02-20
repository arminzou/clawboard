import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronUp } from 'lucide-react';
import { AgentArcadePanel } from './AgentArcadePanel';
import { useAgentPresence, type AgentStatus } from './AgentPresenceContext';

const STATUS_DOT_CLASS: Record<AgentStatus, string> = {
  thinking: 'bg-amber-400',
  idle: 'bg-emerald-400',
  offline: 'bg-slate-400',
};

function labelFromAgentId(id: string) {
  if (!id) return 'Agent';
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function AgentMobileDock() {
  const [expanded, setExpanded] = useState(true);
  const { wsStatus, agentIds, presenceByAgent } = useAgentPresence();

  const summary = useMemo(() => {
    const thinkingCount = agentIds.filter((id) => (presenceByAgent[id]?.status ?? 'offline') === 'thinking').length;
    if (thinkingCount > 0) return `${thinkingCount} thinking`;
    if (wsStatus !== 'connected') return 'Connecting';
    return 'Idle';
  }, [agentIds, presenceByAgent, wsStatus]);

  return (
    <div className="border-t border-slate-200 bg-white/95 backdrop-blur xl:hidden">
      <div>
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2.5"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse Agent Arcade' : 'Expand Agent Arcade'}
          aria-expanded={expanded}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Agent Arcade</div>
            <div className="text-xs font-medium text-slate-700">{summary}</div>
          </div>

          <div className="cb-scrollbar-hidden flex max-w-[56vw] items-center gap-1.5 overflow-x-auto">
            {agentIds.map((agentId) => (
              <span
                key={agentId}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700"
              >
                <span className={clsx('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASS[presenceByAgent[agentId]?.status ?? 'offline'])} />
                <span>{labelFromAgentId(agentId)}</span>
              </span>
            ))}
            <ChevronUp size={16} className={clsx('ml-0.5 text-slate-500 transition-transform', expanded ? 'rotate-180' : '')} />
          </div>
        </button>
      </div>

      <div
        className={clsx(
          'overflow-hidden border-t border-slate-200 bg-[rgb(var(--cb-surface))] transition-[max-height,opacity] duration-200',
          expanded ? 'max-h-[280px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="px-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
          <AgentArcadePanel horizontal hideHeader />
        </div>
      </div>
    </div>
  );
}
