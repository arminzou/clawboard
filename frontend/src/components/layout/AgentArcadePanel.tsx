import { useMemo, type ReactNode } from 'react';
import clsx from 'clsx';
import { AgentTamagotchi } from './AgentTamagotchi';
import { useAgentPresence } from './AgentPresenceContext';
import { profileForAgent } from './agentProfile';

export function AgentArcadePanel({
  compact = false,
  mobileGrid = false,
  horizontal = false,
  hideHeader = false,
}: {
  compact?: boolean;
  mobileGrid?: boolean;
  horizontal?: boolean;
  hideHeader?: boolean;
}) {
  const { agentIds, presenceByAgent, profileSources } = useAgentPresence();

  const sortedAgentIds = useMemo(() => {
    return [...agentIds].sort((a, b) => {
      const aName = profileForAgent(a, profileSources).displayName.toLowerCase();
      const bName = profileForAgent(b, profileSources).displayName.toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [agentIds, profileSources]);

  const groups = useMemo(() => {
    const thinking: string[] = [];
    const online: string[] = [];
    const offline: string[] = [];

    for (const id of sortedAgentIds) {
      const status = presenceByAgent[id]?.status ?? 'offline';
      if (status === 'thinking') thinking.push(id);
      else if (status === 'offline') offline.push(id);
      else online.push(id);
    }

    return { thinking, online, offline };
  }, [sortedAgentIds, presenceByAgent]);

  if (horizontal) {
    return (
      <section className="min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-white p-2">
        {!sortedAgentIds.length ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Waiting for agent discovery...
          </div>
        ) : (
          <div className="cb-scrollbar-hidden min-w-0 w-full max-w-full flex gap-1.5 overflow-x-auto overflow-y-hidden pb-1">
            {sortedAgentIds.map((id) => (
              <AgentTamagotchi
                key={id}
                agentId={id}
                compact
                slot
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  const hasAgents = sortedAgentIds.length > 0;

  return (
    <section
      className={clsx(
        'min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-white shadow-sm',
        compact ? 'p-2' : 'p-3',
        compact ? 'mx-2 mt-2' : '',
      )}
    >
      {!hideHeader ? (
        <div className="mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Agents</div>
        </div>
      ) : null}

      {!hasAgents ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Waiting for agent discovery...
        </div>
      ) : null}

      {hasAgents ? (
        <div className={clsx(mobileGrid ? 'grid grid-cols-2 gap-2' : 'space-y-2')}>
          {groups.thinking.length ? (
            <AgentGroup title="Thinking" count={groups.thinking.length}>
              {groups.thinking.map((id) => (
                <AgentTamagotchi key={id} agentId={id} compact={compact} className={mobileGrid ? 'min-w-0' : undefined} />
              ))}
            </AgentGroup>
          ) : null}

          {groups.online.length ? (
            <AgentGroup title="Online" count={groups.online.length}>
              {groups.online.map((id) => (
                <AgentTamagotchi key={id} agentId={id} compact={compact} className={mobileGrid ? 'min-w-0' : undefined} />
              ))}
            </AgentGroup>
          ) : null}

          {groups.offline.length ? (
            <AgentGroup title="Offline" count={groups.offline.length}>
              {groups.offline.map((id) => (
                <AgentTamagotchi key={id} agentId={id} compact={compact} className={mobileGrid ? 'min-w-0' : undefined} />
              ))}
            </AgentGroup>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function AgentGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 px-1 text-xs font-semibold text-slate-500">
        {title} - {count}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
