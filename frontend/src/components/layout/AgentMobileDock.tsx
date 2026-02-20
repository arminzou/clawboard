import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronUp } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { AgentArcadePanel } from './AgentArcadePanel';

type AgentStatus = 'thinking' | 'idle' | 'offline';
type AgentId = 'tee' | 'fay';

type AgentPresence = {
  status: AgentStatus;
  lastActivity: string | null;
};

const AGENTS: Array<{ id: AgentId; label: string }> = [
  { id: 'tee', label: 'Tee' },
  { id: 'fay', label: 'Fay' },
];

const STATUS_DOT_CLASS: Record<AgentStatus, string> = {
  thinking: 'bg-amber-400',
  idle: 'bg-emerald-400',
  offline: 'bg-slate-400',
};

function createInitialPresence(): Record<AgentId, AgentPresence> {
  return {
    tee: { status: 'offline', lastActivity: null },
    fay: { status: 'offline', lastActivity: null },
  };
}

export function AgentMobileDock() {
  const [expanded, setExpanded] = useState(true);
  const [presence, setPresence] = useState<Record<AgentId, AgentPresence>>(createInitialPresence);
  const { status: wsStatus } = useWebSocket({
    onMessage: (event) => {
      if (event.type !== 'agent_status_updated') return;

      const data = event.data as {
        agentId?: string;
        status?: AgentStatus;
        lastActivity?: string;
      };

      if (!data.status) return;

      if (data.agentId === '*') {
        setPresence((prev) => ({
          tee: { status: data.status as AgentStatus, lastActivity: data.lastActivity ?? prev.tee.lastActivity },
          fay: { status: data.status as AgentStatus, lastActivity: data.lastActivity ?? prev.fay.lastActivity },
        }));
        return;
      }

      if (data.agentId !== 'tee' && data.agentId !== 'fay') return;
      const agentId: AgentId = data.agentId;

      setPresence((prev) => ({
        ...prev,
        [agentId]: {
          status: data.status as AgentStatus,
          lastActivity: data.lastActivity ?? prev[agentId].lastActivity,
        },
      }));
    },
  });

  const summary = useMemo(() => {
    const thinkingCount = AGENTS.filter((a) => presence[a.id].status === 'thinking').length;
    if (thinkingCount > 0) return `${thinkingCount} thinking`;
    if (wsStatus !== 'connected') return 'Connecting';
    return 'Idle';
  }, [presence, wsStatus]);

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

          <div className="flex items-center gap-1.5">
            {AGENTS.map((agent) => (
              <span
                key={agent.id}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700"
              >
                <span className={clsx('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASS[presence[agent.id].status])} />
                <span>{agent.label}</span>
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
