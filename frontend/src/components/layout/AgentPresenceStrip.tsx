import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAgentPresence, type AgentStatus } from './AgentPresenceContext';
import { profileForAgent } from './agentProfile';

const STATUS_META: Record<AgentStatus, { icon: string; badgeClass: string }> = {
  thinking: { icon: '✦', badgeClass: 'bg-amber-400 text-amber-900' },
  idle: { icon: '•', badgeClass: 'bg-emerald-400 text-emerald-900' },
  offline: { icon: '−', badgeClass: 'bg-slate-400 text-slate-800' },
};

export function AgentPresenceStrip({
  horizontal = false,
  className,
}: {
  horizontal?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const { agentIds, presenceByAgent, profileSources } = useAgentPresence();

  const sortedAgentIds = useMemo(() => {
    return [...agentIds].sort((a, b) => {
      const aName = profileForAgent(a, profileSources).displayName.toLowerCase();
      const bName = profileForAgent(b, profileSources).displayName.toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [agentIds, profileSources]);

  if (!sortedAgentIds.length) {
    return (
      <div className={clsx('text-center text-[11px] text-slate-500', className)}>
        No agents
      </div>
    );
  }

  return (
    <div
      className={clsx(
        horizontal
          ? 'cb-scrollbar-hidden flex items-center gap-1.5 overflow-x-auto overflow-y-hidden'
          : 'cb-scrollbar-hidden flex flex-col items-center gap-1.5 overflow-y-auto',
        className,
      )}
    >
      {sortedAgentIds.map((agentId) => {
        const profile = profileForAgent(agentId, profileSources);
        const status = presenceByAgent[agentId]?.status ?? 'offline';
        const meta = STATUS_META[status];
        return (
          <button
            key={agentId}
            type="button"
            className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-base transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
            onClick={() => navigate(`/activity?agent=${encodeURIComponent(agentId)}`)}
            title={`${profile.displayName} (${status})`}
            aria-label={`Open ${profile.displayName} activity`}
          >
            <span className="leading-none">{profile.avatar}</span>
            <span
              className={clsx(
                'absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white text-[9px] font-bold',
                meta.badgeClass,
              )}
              aria-hidden
            >
              {meta.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}

