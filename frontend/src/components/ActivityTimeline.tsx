import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Activity } from '../lib/api';

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
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agent, setAgent] = useState<string>(() => {
    try {
      return window.localStorage.getItem('pm.activity.agent') ?? '';
    } catch {
      return '';
    }
  });

  const [typeFilter, setTypeFilter] = useState<string>(() => {
    try {
      return window.localStorage.getItem('pm.activity.q') ?? '';
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
      window.localStorage.setItem('pm.activity.agent', agent);
    } catch {
      // ignore
    }
  }, [agent]);

  useEffect(() => {
    try {
      window.localStorage.setItem('pm.activity.q', typeFilter);
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
          <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
          <div className="text-sm text-slate-600">Latest agent events (manual + ingested session logs).</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
          >
            <option value="">All agents</option>
            <option value="tee">tee</option>
            <option value="fay">fay</option>
            <option value="armin">armin</option>
          </select>
          <input
            className="w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Filter type/desc…"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
          <button
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </button>
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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
          </button>
        </div>
      </div>

      {loading ? <div className="text-sm text-slate-600">Loading…</div> : null}
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>
      ) : null}

      <div className="flex flex-col gap-4">
        {grouped.map((g) => (
          <div key={g.day} className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.day}</div>
            {g.rows.map((a) => (
              <div key={a.id} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-900">
                    {a.agent} • {a.activity_type}
                  </div>
                  <div className="text-xs text-slate-500">{when(a.timestamp)}</div>
                </div>
                <div className="mt-1 text-sm text-slate-700">{a.description}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                  {a.related_task_id ? (
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => onOpenTask?.(a.related_task_id as number)}
                    >
                      task #{a.related_task_id}
                    </button>
                  ) : null}
                  {a.session_key ? <span className="font-mono">{a.session_key}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ))}

        {!grouped.length && !loading ? (
          <div className="text-sm text-slate-600">No activity yet.</div>
        ) : null}
      </div>
    </div>
  );
}
