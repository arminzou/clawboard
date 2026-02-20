import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Activity } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Panel } from '../../components/ui/Panel';

function when(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function dayKey(ts: string) {
  const d = new Date(ts);
  // local date grouping
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function ActivityTimeline({
  wsSignal,
  onOpenTask,
}: {
  wsSignal?: { type?: string; data?: unknown } | null;
  onOpenTask?: (id: number) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agent, setAgent] = useState<string>(() => {
    try {
      const fromQuery = new URLSearchParams(window.location.search).get('agent');
      if (fromQuery) return fromQuery;
    } catch {
      // ignore
    }
    try {
      return (
        window.localStorage.getItem('cb.activity.agent') ??
        window.localStorage.getItem('pm.activity.agent') ??
        ''
      );
    } catch {
      return '';
    }
  });

  const [typeFilter, setTypeFilter] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.activity.q') ?? window.localStorage.getItem('pm.activity.q') ?? '';
    } catch {
      return '';
    }
  });
  const [ingesting, setIngesting] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const a = await api.listActivities({ limit: 100, agent: agent || undefined });
      setItems(a);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.activity.agent', agent);
    } catch {
      // ignore
    }
  }, [agent]);

  useEffect(() => {
    if (!searchParams.has('agent')) return;
    const fromQuery = searchParams.get('agent') ?? '';
    if (fromQuery !== agent) setAgent(fromQuery);
  }, [searchParams, agent]);

  function handleAgentChange(nextAgent: string) {
    setAgent(nextAgent);
    const next = new URLSearchParams(searchParams);
    if (nextAgent) next.set('agent', nextAgent);
    else next.delete('agent');
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.activity.q', typeFilter);
    } catch {
      // ignore
    }
  }, [typeFilter]);

  useEffect(() => {
    if (!wsSignal?.type) return;

    try {
      if (wsSignal.type === 'activity_created' && wsSignal.data) {
        const a = wsSignal.data as Activity;
        setItems((prev) => {
          if (prev.some((x) => x.id === a.id)) return prev;
          return [a, ...prev].slice(0, 200);
        });
        return;
      }

      // ingest/resync/etc: safest to refresh
      if (String(wsSignal.type).startsWith('activity_')) refresh();
    } catch {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsSignal?.type]);

  const filtered = useMemo(() => {
    const q = typeFilter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => String(a.activity_type).toLowerCase().includes(q) || String(a.description).toLowerCase().includes(q));
  }, [items, typeFilter]);

  const grouped = useMemo(() => {
    const out: Array<{ day: string; rows: Activity[] }> = [];
    const map = new Map<string, Activity[]>();
    for (const a of filtered) {
      const k = dayKey(a.timestamp);
      const arr = map.get(k) ?? [];
      arr.push(a);
      map.set(k, arr);
    }

    // preserve time order inside each day (already DESC), but make day groups in first-seen order
    for (const a of filtered) {
      const k = dayKey(a.timestamp);
      if (!out.some((x) => x.day === k)) out.push({ day: k, rows: map.get(k) ?? [] });
    }

    return out;
  }, [filtered]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[rgb(var(--cb-text))]">Activity</h2>
          <div className="text-sm text-[rgb(var(--cb-text-muted))]">Latest agent events (manual + ingested session logs).</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="cb-input w-44"
            value={agent}
            onChange={(e) => handleAgentChange(e.target.value)}
          >
            <option value="">All agents</option>
            <option value="tee">tee</option>
            <option value="fay">fay</option>
            <option value="armin">armin</option>
          </select>

          <div className="w-72">
            <Input placeholder="Filter type/desc…" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} />
          </div>

          <Button variant="secondary" onClick={refresh} disabled={loading}>
            Refresh
          </Button>

          <Button
            variant="primary"
            disabled={ingesting}
            onClick={async () => {
              setIngesting(true);
              try {
                await api.ingestSessions();
                await refresh();
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
              } finally {
                setIngesting(false);
              }
            }}
          >
            {ingesting ? 'Ingesting…' : 'Ingest sessions'}
          </Button>
        </div>
      </div>

      {loading ? <div className="text-sm text-[rgb(var(--cb-text-muted))]">Loading…</div> : null}
      {error ? (
        <Panel className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</Panel>
      ) : null}

      <div className="flex flex-col gap-4">
        {grouped.map((g) => (
          <div key={g.day} className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--cb-text-muted))]">{g.day}</div>
            {g.rows.map((a) => (
              <Panel key={a.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-[rgb(var(--cb-text))]">
                    {a.agent} • {a.activity_type}
                  </div>
                  <div className="text-xs text-[rgb(var(--cb-text-muted))]">{when(a.timestamp)}</div>
                </div>
                <div className="mt-1 text-sm text-[rgb(var(--cb-text))] opacity-90">{a.description}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-[rgb(var(--cb-text-muted))]">
                  {a.related_task_id ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="font-mono"
                      onClick={() => onOpenTask?.(a.related_task_id as number)}
                    >
                      task #{a.related_task_id}
                    </Button>
                  ) : null}
                  {a.session_key ? <span className="font-mono">{a.session_key}</span> : null}
                </div>
              </Panel>
            ))}
          </div>
        ))}

        {!grouped.length && !loading ? (
          <div className="text-sm text-[rgb(var(--cb-text-muted))]">No activity yet.</div>
        ) : null}
      </div>
    </div>
  );
}
