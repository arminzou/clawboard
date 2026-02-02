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

function formatBytes(bytes: number | null | undefined) {
  if (bytes == null || Number.isNaN(Number(bytes))) return '';
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

type SortKey = 'recent' | 'path' | 'size';

export function DocsView({
  wsSignal,
}: {
  wsSignal?:
    | {
        type?: string;
        data?: unknown;
      }
    | null;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [stats, setStats] = useState<DocsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [dirtyOnly, setDirtyOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<SortKey>('recent');
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

  const knownTypes = useMemo(() => {
    const set = new Set<string>();
    for (const d of docs) {
      if (d.file_type) set.add(String(d.file_type));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [docs]);

  const filteredSorted = useMemo(() => {
    const q = filter.trim().toLowerCase();

    let list = docs;
    if (q) list = list.filter((d) => d.file_path.toLowerCase().includes(q));
    if (dirtyOnly) list = list.filter((d) => (d.git_status ?? 'clean') !== 'clean');
    if (typeFilter) list = list.filter((d) => String(d.file_type ?? '') === typeFilter);

    const next = [...list];
    next.sort((a, b) => {
      if (sort === 'path') return a.file_path.localeCompare(b.file_path);
      if (sort === 'size') return Number(b.size_bytes ?? 0) - Number(a.size_bytes ?? 0);

      // recent (default)
      const at = a.last_modified ? new Date(a.last_modified).getTime() : 0;
      const bt = b.last_modified ? new Date(b.last_modified).getTime() : 0;
      return bt - at;
    });

    return next;
  }, [docs, dirtyOnly, filter, sort, typeFilter]);

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
            title="Git status"
          >
            <option value="">All statuses</option>
            <option value="modified">modified</option>
            <option value="added">added</option>
            <option value="deleted">deleted</option>
            <option value="untracked">untracked</option>
            <option value="clean">clean</option>
          </select>

          <select
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            title="File type"
          >
            <option value="">All types</option>
            {knownTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            title="Sort"
          >
            <option value="recent">recent</option>
            <option value="path">path</option>
            <option value="size">size</option>
          </select>

          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
            <input type="checkbox" checked={dirtyOnly} onChange={(e) => setDirtyOnly(e.target.checked)} />
            dirty only
          </label>

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
            {filteredSorted.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs text-slate-800">{d.file_path}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{d.git_status ?? ''}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{d.file_type ?? ''}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{formatBytes(d.size_bytes)}</td>
                <td className="px-3 py-2 text-xs text-slate-700">
                  {d.last_modified ? new Date(d.last_modified).toLocaleString() : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filteredSorted.length === 0 ? (
        <div className="text-sm text-slate-600">No documents match your filters.</div>
      ) : null}
    </div>
  );
}
