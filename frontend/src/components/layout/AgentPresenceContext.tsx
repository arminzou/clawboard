import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { WsStatus } from '../../hooks/useWebSocket';

export type AgentStatus = 'thinking' | 'idle' | 'offline';

export interface AgentPresence {
  status: AgentStatus;
  lastActivity: string | null;
  agentThought: string | null;
}

type AgentStatusEvent = {
  agentId?: string;
  status?: AgentStatus;
  lastActivity?: string;
  thought?: string;
};

type AgentPresenceContextValue = {
  wsStatus: WsStatus;
  agentIds: string[];
  presenceByAgent: Record<string, AgentPresence>;
};

const DEFAULT_PRESENCE: AgentPresence = {
  status: 'offline',
  lastActivity: null,
  agentThought: null,
};

const PINNED_AGENT_ORDER = ['tee', 'fay', 'armin'];
const DEFAULT_AGENT_IDS = ['tee', 'fay'];

const AgentPresenceContext = createContext<AgentPresenceContextValue | null>(null);

function createInitialPresence(): Record<string, AgentPresence> {
  return {
    tee: { ...DEFAULT_PRESENCE },
    fay: { ...DEFAULT_PRESENCE },
  };
}

export function AgentPresenceProvider({
  wsSignal,
  wsStatus = 'disconnected',
  children,
}: {
  wsSignal?: { type?: string; data?: unknown } | null;
  wsStatus?: WsStatus;
  children: ReactNode;
}) {
  const [presenceByAgent, setPresenceByAgent] = useState<Record<string, AgentPresence>>(createInitialPresence);

  useEffect(() => {
    if (wsSignal?.type !== 'agent_status_updated') return;

    const data = wsSignal.data as AgentStatusEvent;
    const status = data?.status;
    if (!status) return;

    setPresenceByAgent((prev) => {
      const next: Record<string, AgentPresence> = { ...prev };

      if (data.agentId === '*') {
        const ids = Object.keys(next).length ? Object.keys(next) : DEFAULT_AGENT_IDS;
        for (const id of ids) {
          const current = next[id] ?? DEFAULT_PRESENCE;
          next[id] = {
            status,
            lastActivity: data.lastActivity ?? current.lastActivity,
            agentThought: status === 'offline' ? null : data.thought ?? current.agentThought,
          };
        }
        return next;
      }

      const normalizedId = String(data.agentId ?? '').trim().toLowerCase();
      if (!normalizedId) return prev;

      const current = next[normalizedId] ?? DEFAULT_PRESENCE;
      next[normalizedId] = {
        status,
        lastActivity: data.lastActivity ?? current.lastActivity,
        agentThought: status === 'offline' ? null : data.thought ?? current.agentThought,
      };
      return next;
    });
  }, [wsSignal]);

  const agentIds = useMemo(() => {
    const ids = Object.keys(presenceByAgent);
    ids.sort((a, b) => {
      const ai = PINNED_AGENT_ORDER.indexOf(a);
      const bi = PINNED_AGENT_ORDER.indexOf(b);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return a.localeCompare(b);
    });
    return ids;
  }, [presenceByAgent]);

  const value = useMemo<AgentPresenceContextValue>(
    () => ({ wsStatus, agentIds, presenceByAgent }),
    [wsStatus, agentIds, presenceByAgent],
  );

  return <AgentPresenceContext.Provider value={value}>{children}</AgentPresenceContext.Provider>;
}

export function useAgentPresence() {
  const ctx = useContext(AgentPresenceContext);
  if (!ctx) {
    throw new Error('useAgentPresence must be used within AgentPresenceProvider');
  }
  return ctx;
}
