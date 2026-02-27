import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { Document as Doc, DocsStats } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Input } from '../../components/ui/Input';
import { Panel } from '../../components/ui/Panel';

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
  const [filter, setFilter] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.docs.q') ?? window.localStorage.getItem('pm.docs.q') ?? '';
    } catch {
      return '';
    }
  });

  const [status, setStatus] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.docs.status') ?? window.localStorage.getItem('pm.docs.status') ?? '';
    } catch {
      return '';
    }
  });

  const [typeFilter, setTypeFilter] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.docs.type') ?? window.localStorage.getItem('pm.docs.type') ?? '';
    } catch {
      return '';
    }
  });

  const [dirtyOnly, setDirtyOnly] = useState<boolean>(() => {
    try {
      return (
        (window.localStorage.getItem('cb.docs.dirtyOnly') ?? window.localStorage.getItem('pm.docs.dirtyOnly') ?? '') ===
        '1'
      );
    } catch {
      return false;
    }
  });

  const [sort, setSort] = useState<SortKey>(() => {
    try {
      const raw = window.localStorage.getItem('cb.docs.sort') ?? window.localStorage.getItem('pm.docs.sort') ?? 'recent';
      return (raw === 'recent' || raw === 'path' || raw === 'size' ? raw : 'recent') as SortKey;
    } catch {
      return 'recent';
    }
  });
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
    try {
      window.localStorage.setItem('cb.docs.q', filter);
    } catch {
      // ignore
    }
  }, [filter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.docs.status', status);
    } catch {
      // ignore
    }
  }, [status]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.docs.type', typeFilter);
    } catch {
      // ignore
    }
  }, [typeFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.docs.dirtyOnly', dirtyOnly ? '1' : '0');
    } catch {
      // ignore
    }
  }, [dirtyOnly]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.docs.sort', sort);
    } catch {
      // ignore
    }
  }, [sort]);

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
          <h2 className="text-lg font-semibold text-[rgb(var(--cb-text))]">Docs</h2>
          <div className="text-sm text-[rgb(var(--cb-text-muted))]">Tracked workspace files.</div>
          <div className="mt-1 text-xs text-[rgb(var(--cb-text-muted))]">
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
          <div className="w-72">
            <Input
              placeholder="Filter path…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <select
            className="cb-input"
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
            className="cb-input"
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
            className="cb-input"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            title="Sort"
          >
            <option value="recent">recent</option>
            <option value="path">path</option>
            <option value="size">size</option>
          </select>

          <div className="flex items-center rounded-xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-3 py-2">
            <Checkbox
              size="sm"
              checked={dirtyOnly}
              onChange={(e) => setDirtyOnly(e.target.checked)}
              label="dirty only"
              className="gap-2"
              labelClassName="text-sm text-[rgb(var(--cb-text))]"
            />
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              refresh();
              refreshStats();
            }}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
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
          </Button>
        </div>
      </div>

      {loading ? <div className="text-sm text-[rgb(var(--cb-text-muted))]">Loading…</div> : null}

      <Panel className="overflow-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[rgb(var(--cb-surface-muted))] text-xs uppercase text-[rgb(var(--cb-text-muted))]">
            <tr>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Modified</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((d) => {
              const status = String(d.git_status ?? '');
              const statusClass =
                status === 'modified'
                  ? 'bg-amber-100 text-amber-900'
                  : status === 'added'
                    ? 'bg-green-100 text-green-900'
                    : status === 'deleted'
                      ? 'bg-red-100 text-red-900'
                      : status === 'untracked'
                        ? 'bg-purple-100 text-purple-900'
                        : status === 'clean'
                          ? 'bg-[rgb(var(--cb-surface-muted))] text-[rgb(var(--cb-text-muted))]'
                          : 'bg-[rgb(var(--cb-surface-muted))] text-[rgb(var(--cb-text-muted))]';

              return (
                <tr
                  key={d.id}
                  className={
                    (d.git_status ?? 'clean') !== 'clean'
                      ? 'border-t border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-accent-soft))]'
                      : 'border-t border-[rgb(var(--cb-border))]'
                  }
                >
                  <td className="px-3 py-2 font-mono text-xs text-[rgb(var(--cb-text))]">
                    <button
                      type="button"
                      className="text-left hover:underline"
                      title="Click to copy"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(d.file_path);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      {d.file_path}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {status ? <span className={`rounded px-2 py-0.5 ${statusClass}`}>{status}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-[rgb(var(--cb-text-muted))]">{d.file_type ?? ''}</td>
                  <td className="px-3 py-2 text-xs text-[rgb(var(--cb-text-muted))]">{formatBytes(d.size_bytes)}</td>
                  <td className="px-3 py-2 text-xs text-[rgb(var(--cb-text-muted))]">
                    {d.last_modified ? new Date(d.last_modified).toLocaleString() : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      {!loading && filteredSorted.length === 0 ? (
        <div className="text-sm text-[rgb(var(--cb-text-muted))]">No documents match your filters.</div>
      ) : null}
    </div>
  );
}
