import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAgentPresence } from './AgentPresenceContext';
import { AgentPresenceAvatar } from './AgentPresenceAvatar';
import { profileForAgent } from './agentProfile';

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
        return (
          <button
            key={agentId}
            type="button"
            className="group relative inline-flex shrink-0 items-center justify-center transition hover:brightness-[0.985] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
            onClick={() => navigate(`/activity?agent=${encodeURIComponent(agentId)}`)}
            title={`${profile.displayName} (${status})`}
            aria-label={`Open ${profile.displayName} activity`}
          >
            <AgentPresenceAvatar avatar={profile.avatar} status={status} />
          </button>
        );
      })}
    </div>
  );
}
