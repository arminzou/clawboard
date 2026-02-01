import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Activity } from '../lib/api';

function when(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function ActivityTimeline({ wsSignal }: { wsSignal?: any }) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const a = await api.listActivities({ limit: 50 });
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
  }, []);

  useEffect(() => {
    if (!wsSignal) return;
    if (String(wsSignal.type || '').startsWith('activity_')) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsSignal?.type]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
          <div className="text-sm text-slate-600">Latest agent events (manual + parsed soon).</div>
        </div>
        <button
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          onClick={refresh}
        >
          Refresh
        </button>
      </div>

      {loading ? <div className="text-sm text-slate-600">Loading…</div> : null}
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Failed to load activity feed: {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {items.map((a) => (
          <div key={a.id} className="rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-900">{a.agent} • {a.activity_type}</div>
              <div className="text-xs text-slate-500">{when(a.timestamp)}</div>
            </div>
            <div className="mt-1 text-sm text-slate-700">{a.description}</div>
            {a.related_task_id ? (
              <div className="mt-1 text-xs text-slate-500">task #{a.related_task_id}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
