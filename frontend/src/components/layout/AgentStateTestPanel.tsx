import { useMemo } from 'react';
import clsx from 'clsx';
import { useAgentPresence, type AgentStatus } from './AgentPresenceContext';

const STATUS_ORDER: AgentStatus[] = ['idle', 'thinking', 'offline'];

const SCENARIO_THOUGHT: Record<AgentStatus, string | null> = {
  idle: 'Waiting for next task',
  thinking: 'Evaluating implementation options',
  offline: null,
};

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const qp = new URLSearchParams(window.location.search).get('agentTest');
  if (qp === '1' || qp === 'true' || qp === 'yes') return true;
  const raw = String(((import.meta as unknown as { env?: { VITE_AGENT_STATE_TEST?: string } }).env?.VITE_AGENT_STATE_TEST) ?? '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function AgentStateTestPanel() {
  const enabled = useMemo(() => isEnabled(), []);
  const { agentIds, presenceByAgent, setAgentPresence, setAllAgentStatus } = useAgentPresence();

  if (!enabled) return null;

  const ids = agentIds.length ? agentIds : ['tee', 'fay'];

  function applyMixedScenario() {
    ids.forEach((id, idx) => {
      const status = STATUS_ORDER[idx % STATUS_ORDER.length];
      setAgentPresence(id, { status, agentThought: SCENARIO_THOUGHT[status] });
    });
  }

  return (
    <aside className="fixed bottom-4 left-20 z-50 w-[340px] max-w-[calc(100vw-6rem)] rounded-xl border border-amber-200/60 bg-white/95 p-3 text-slate-800 shadow-xl backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Agent Test Mode</div>
          <div className="text-[11px] text-slate-500">Force agent states directly in UI</div>
        </div>
        <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">ON</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          onClick={() => setAllAgentStatus('idle', SCENARIO_THOUGHT.idle)}
        >
          All Idle
        </button>
        <button
          type="button"
          className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
          onClick={() => setAllAgentStatus('thinking', SCENARIO_THOUGHT.thinking)}
        >
          All Thinking
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
          onClick={() => setAllAgentStatus('offline', SCENARIO_THOUGHT.offline)}
        >
          All Offline
        </button>
        <button
          type="button"
          className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
          onClick={applyMixedScenario}
        >
          Mixed
        </button>
      </div>

      <div className="max-h-52 space-y-1.5 overflow-auto pr-1">
        {ids.map((id) => {
          const current = presenceByAgent[id]?.status ?? 'offline';
          return (
            <div key={id} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-800">{id}</span>
                <span className="text-[10px] text-slate-500">current: {current}</span>
              </div>
              <div className="flex gap-1">
                {STATUS_ORDER.map((status) => (
                  <button
                    key={`${id}-${status}`}
                    type="button"
                    className={clsx(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      current === status
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                    )}
                    onClick={() => setAgentPresence(id, { status, agentThought: SCENARIO_THOUGHT[status] })}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

