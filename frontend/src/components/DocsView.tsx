import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Document as Doc, DocsStats } from '../lib/api';

function countByStatus(stats: DocsStats | null | undefined) {
  const map = new Map<string, number>();
  for (const row of stats?.by_status ?? []) {
    map.set(String(row.git_status ?? 'unknown'), Number(row.count ?? 0));
  }
  return map;
}

export function DocsView({ wsSignal }: { wsSignal?: any }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [stats, setStats] = useState<DocsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [resyncing, setResyncing] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const d = await api.listDocs({ git_status: status || undefined, limit: 200 });
      setDocs(d);
    } finally {
      setLoading(false);
    }
  }

  async function refreshStats() {
    setStatsLoading(true);
    try {
      setStats(await api.docsStats());
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    refreshStats();
  }, []);

  useEffect(() => {
    if (!wsSignal?.type) return;

    try {
      if (wsSignal.type === 'document_updated' && wsSignal.data) {
        const doc = wsSignal.data as Doc;
        setDocs((prev) => {
          const idx = prev.findIndex((d) => d.id === doc.id);
          if (idx < 0) return [doc, ...prev];
          const next = [...prev];
          next[idx] = doc;
          return next;
        });
        refreshStats();
        return;
      }

      if (String(wsSignal.type).startsWith('document_')) {
        refresh();
        refreshStats();
      }
    } catch {
      refresh();
      refreshStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsSignal?.type]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.file_path.toLowerCase().includes(q));
  }, [docs, filter]);

  const byStatus = useMemo(() => countByStatus(stats), [stats]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Docs</h2>
          <div className="text-sm text-slate-600">Tracked workspace files.</div>
          <div className="mt-1 text-xs text-slate-500">
            {statsLoading ? (
              'Loading stats…'
            ) : stats ? (
              <span>
                total {stats.total} • modified {byStatus.get('modified') ?? 0} • untracked {byStatus.get('untracked') ?? 0} • clean {byStatus.get('clean') ?? 0}
              </span>
            ) : (
              'No stats'
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            className="w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Filter path…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="modified">modified</option>
            <option value="added">added</option>
            <option value="deleted">deleted</option>
            <option value="untracked">untracked</option>
            <option value="clean">clean</option>
          </select>
          <button
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            onClick={() => {
              refresh();
              refreshStats();
            }}
          >
            Refresh
          </button>
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={resyncing}
            onClick={async () => {
              setResyncing(true);
              try {
                await api.resyncDocs();
                await refresh();
                await refreshStats();
              } finally {
                setResyncing(false);
              }
            }}
          >
            {resyncing ? 'Resyncing…' : 'Resync'}
          </button>
        </div>
      </div>

      {loading ? <div className="text-sm text-slate-600">Loading…</div> : null}

      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Modified</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs text-slate-800">{d.file_path}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{d.git_status ?? ''}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{d.file_type ?? ''}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{d.size_bytes ?? ''}</td>
                <td className="px-3 py-2 text-xs text-slate-700">
                  {d.last_modified ? new Date(d.last_modified).toLocaleString() : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
