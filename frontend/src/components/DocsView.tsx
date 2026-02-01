import { useEffect, useMemo, useState } from 'react';

type Doc = {
  id: number;
  file_path: string;
  file_type: string | null;
  last_modified: string | null;
  last_modified_by: string | null;
  size_bytes: number | null;
  git_status: string | null;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3001';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export function DocsView({ wsSignal }: { wsSignal?: any }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  async function refresh() {
    setLoading(true);
    try {
      const usp = new URLSearchParams();
      if (status) usp.set('git_status', status);
      usp.set('limit', '200');
      const url = `${API_BASE}/api/docs?${usp.toString()}`;
      const d = await fetchJson<Doc[]>(url);
      setDocs(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!wsSignal) return;
    if (String(wsSignal.type || '').startsWith('document_')) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsSignal?.type]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.file_path.toLowerCase().includes(q));
  }, [docs, filter]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Docs</h2>
          <div className="text-sm text-slate-600">Tracked workspace files (via sync-docs).</div>
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
            onClick={refresh}
          >
            Refresh
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
                <td className="px-3 py-2 text-xs text-slate-700">{d.last_modified ? new Date(d.last_modified).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
