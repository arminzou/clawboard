import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { WsStatus } from '../../hooks/useWebSocket';
import { normalizeAgentId, normalizeAgentIds, normalizeProfileSources, profileForAgent, type AgentProfileSources } from './agentProfile';

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
  profileSources: AgentProfileSources;
  setAgentPresence: (agentId: string, patch: Partial<AgentPresence> & { status?: AgentStatus }) => void;
  setAllAgentStatus: (status: AgentStatus, thought?: string | null) => void;
};

const DEFAULT_PRESENCE: AgentPresence = {
  status: 'offline',
  lastActivity: null,
  agentThought: null,
};

const AgentPresenceContext = createContext<AgentPresenceContextValue | null>(null);

function createInitialPresence(agentIds: string[]): Record<string, AgentPresence> {
  const out: Record<string, AgentPresence> = {};
  for (const id of normalizeAgentIds(agentIds)) out[id] = { ...DEFAULT_PRESENCE };
  return out;
}

export function AgentPresenceProvider({
  wsSignal,
  wsStatus = 'disconnected',
  initialAgentIds = [],
  profileSources = {},
  children,
}: {
  wsSignal?: { type?: string; data?: unknown } | null;
  wsStatus?: WsStatus;
  initialAgentIds?: string[];
  profileSources?: AgentProfileSources;
  children: ReactNode;
}) {
  const normalizedProfileSources = useMemo(() => normalizeProfileSources(profileSources), [profileSources]);
  const [agentIds, setAgentIds] = useState<string[]>(() => normalizeAgentIds(initialAgentIds));
  const [presenceByAgent, setPresenceByAgent] = useState<Record<string, AgentPresence>>(() =>
    createInitialPresence(initialAgentIds),
  );

  useEffect(() => {
    const normalized = normalizeAgentIds(initialAgentIds);
    if (!normalized.length) return;

    setAgentIds((prev) => {
      const seen = new Set(prev);
      let changed = false;
      const next = [...prev];
      for (const id of normalized) {
        if (seen.has(id)) continue;
        seen.add(id);
        changed = true;
        next.push(id);
      }
      return changed ? next : prev;
    });

    setPresenceByAgent((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of normalized) {
        if (next[id]) continue;
        next[id] = { ...DEFAULT_PRESENCE };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [initialAgentIds]);

  useEffect(() => {
    if (wsSignal?.type !== 'agent_status_updated') return;

    const data = wsSignal.data as AgentStatusEvent;
    const status = data?.status;
    if (!status) return;

    const normalizedId = normalizeAgentId(String(data.agentId ?? ''));
    if (normalizedId && data.agentId !== '*') {
      setAgentIds((prevIds) => (prevIds.includes(normalizedId) ? prevIds : [...prevIds, normalizedId]));
    }

    setPresenceByAgent((prev) => {
      const next: Record<string, AgentPresence> = { ...prev };

      if (data.agentId === '*') {
        const ids = Object.keys(next);
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

      const normalizedId = normalizeAgentId(String(data.agentId ?? ''));
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

  const setAgentPresence = useCallback((agentId: string, patch: Partial<AgentPresence> & { status?: AgentStatus }) => {
    const normalizedId = normalizeAgentId(agentId);
    if (!normalizedId) return;

    setAgentIds((prevIds) => (prevIds.includes(normalizedId) ? prevIds : [...prevIds, normalizedId]));
    setPresenceByAgent((prev) => {
      const current = prev[normalizedId] ?? DEFAULT_PRESENCE;
      const nextStatus = patch.status ?? current.status;
      const nextThought = patch.agentThought !== undefined
        ? patch.agentThought
        : (nextStatus === 'offline' ? null : current.agentThought);

      return {
        ...prev,
        [normalizedId]: {
          status: nextStatus,
          lastActivity: patch.lastActivity ?? new Date().toISOString(),
          agentThought: nextThought,
        },
      };
    });
  }, []);

  const setAllAgentStatus = useCallback((status: AgentStatus, thought?: string | null) => {
    setPresenceByAgent((prev) => {
      const next: Record<string, AgentPresence> = { ...prev };
      const now = new Date().toISOString();
      for (const id of Object.keys(next)) {
        const current = next[id] ?? DEFAULT_PRESENCE;
        next[id] = {
          status,
          lastActivity: now,
          agentThought:
            thought !== undefined
              ? thought
              : (status === 'offline' ? null : current.agentThought),
        };
      }
      return next;
    });
  }, []);

  const value = useMemo<AgentPresenceContextValue>(
    () => ({
      wsStatus,
      agentIds,
      presenceByAgent,
      profileSources: normalizedProfileSources,
      setAgentPresence,
      setAllAgentStatus,
    }),
    [wsStatus, agentIds, presenceByAgent, normalizedProfileSources, setAgentPresence, setAllAgentStatus],
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

export function useAgentProfile(agentId: string) {
  const { profileSources } = useAgentPresence();
  return useMemo(() => profileForAgent(agentId, profileSources), [agentId, profileSources]);
}
