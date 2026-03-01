import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { Document as Doc, DocsStats, Task } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Input } from '../../components/ui/Input';
import { Panel } from '../../components/ui/Panel';

const DOC_TYPE_TAGS = ['spec', 'runbook', 'reference', 'decision'] as const;

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

type SortKey = 'recent' | 'path' | 'size' | 'last_read';

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
  const [tasks, setTasks] = useState<Task[]>([]);
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
  const [docTypeTagFilter, setDocTypeTagFilter] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.docs.docTypeTag') ?? '';
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
      return (raw === 'recent' || raw === 'path' || raw === 'size' || raw === 'last_read' ? raw : 'recent') as SortKey;
    } catch {
      return 'recent';
    }
  });
  const [resyncing, setResyncing] = useState(false);
  const [attachTaskByDocId, setAttachTaskByDocId] = useState<Record<number, string>>({});
  const [busyDocId, setBusyDocId] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const d = await api.listDocs({ git_status: status || undefined, doc_type_tag: docTypeTagFilter || undefined, limit: 400 });
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

  async function refreshTasks() {
    try {
      setTasks(await api.listTasks({ include_archived: true }));
    } catch {
      setTasks([]);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, docTypeTagFilter]);

  useEffect(() => {
    refreshStats();
    refreshTasks();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.docs.q', filter);
      window.localStorage.setItem('cb.docs.status', status);
      window.localStorage.setItem('cb.docs.type', typeFilter);
      window.localStorage.setItem('cb.docs.docTypeTag', docTypeTagFilter);
      window.localStorage.setItem('cb.docs.dirtyOnly', dirtyOnly ? '1' : '0');
      window.localStorage.setItem('cb.docs.sort', sort);
    } catch {
      // ignore
    }
  }, [dirtyOnly, docTypeTagFilter, filter, sort, status, typeFilter]);

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
    if (docTypeTagFilter) list = list.filter((d) => String(d.doc_type_tag ?? '') === docTypeTagFilter);

    const next = [...list];
    next.sort((a, b) => {
      if (sort === 'path') return a.file_path.localeCompare(b.file_path);
      if (sort === 'size') return Number(b.size_bytes ?? 0) - Number(a.size_bytes ?? 0);
      if (sort === 'last_read') {
        const at = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
        const bt = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
        return bt - at;
      }
      const at = a.last_modified ? new Date(a.last_modified).getTime() : 0;
      const bt = b.last_modified ? new Date(b.last_modified).getTime() : 0;
      return bt - at;
    });

    return next;
  }, [dirtyOnly, docTypeTagFilter, docs, filter, sort, typeFilter]);

  const byStatus = useMemo(() => countByStatus(stats), [stats]);
  const tasksForAttach = useMemo(
    () => [...tasks].filter((t) => t.status !== 'done').sort((a, b) => a.id - b.id),
    [tasks],
  );

  async function updateDocType(docId: number, docTypeTag: string) {
    setBusyDocId(docId);
    try {
      const updated = await api.updateDoc(docId, { doc_type_tag: docTypeTag || null });
      setDocs((prev) => prev.map((doc) => (doc.id === docId ? updated : doc)));
      await refreshStats();
    } finally {
      setBusyDocId(null);
    }
  }

  async function attachDocToTask(docId: number) {
    const rawTaskId = attachTaskByDocId[docId];
    const taskId = Number(rawTaskId);
    if (!Number.isFinite(taskId)) return;
    setBusyDocId(docId);
    try {
      const updated = await api.attachDocToTask(docId, taskId);
      setDocs((prev) => prev.map((doc) => (doc.id === docId ? updated : doc)));
      setAttachTaskByDocId((prev) => ({ ...prev, [docId]: '' }));
    } finally {
      setBusyDocId(null);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[rgb(var(--cb-text))]">Docs</h2>
          <div className="text-sm text-[rgb(var(--cb-text-muted))]">Tracked workspace files with task links and read context.</div>
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
            <Input placeholder="Filter path…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>

          <select className="cb-input" value={status} onChange={(e) => setStatus(e.target.value)} title="Git status">
            <option value="">All statuses</option>
            <option value="modified">modified</option>
            <option value="added">added</option>
            <option value="deleted">deleted</option>
            <option value="untracked">untracked</option>
            <option value="clean">clean</option>
          </select>

          <select className="cb-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} title="File type">
            <option value="">All file types</option>
            {knownTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select className="cb-input" value={docTypeTagFilter} onChange={(e) => setDocTypeTagFilter(e.target.value)} title="Doc type tag">
            <option value="">All doc tags</option>
            {DOC_TYPE_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select className="cb-input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} title="Sort">
            <option value="recent">recent</option>
            <option value="last_read">last read</option>
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
              refreshTasks();
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
                await refreshTasks();
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
              <th className="px-3 py-2">Doc Tag</th>
              <th className="px-3 py-2">Linked Tasks</th>
              <th className="px-3 py-2">Last Read</th>
              <th className="px-3 py-2">Modified</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((d) => {
              const statusLabel = String(d.git_status ?? '');
              const statusClass =
                statusLabel === 'modified'
                  ? 'bg-amber-100 text-amber-900'
                  : statusLabel === 'added'
                    ? 'bg-green-100 text-green-900'
                    : statusLabel === 'deleted'
                      ? 'bg-red-100 text-red-900'
                      : statusLabel === 'untracked'
                        ? 'bg-blue-100 text-blue-900'
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
                  <td className="px-3 py-2 font-mono text-xs text-[rgb(var(--cb-text))] align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto w-full justify-start rounded-md px-1 py-0.5 text-left font-mono text-xs text-[rgb(var(--cb-text))] hover:underline"
                      title="Click to copy and mark read"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(d.file_path);
                        } catch {
                          // ignore clipboard failures
                        }

                        try {
                          const updated = await api.markDocAccessed(d.id);
                          setDocs((prev) => prev.map((doc) => (doc.id === d.id ? updated : doc)));
                        } catch {
                          // ignore access tracking errors
                        }
                      }}
                    >
                      {d.file_path}
                    </Button>
                    <div className="mt-0.5 text-[11px] text-[rgb(var(--cb-text-muted))]">{formatBytes(d.size_bytes)}</div>
                  </td>
                  <td className="px-3 py-2 text-xs align-top">
                    {statusLabel ? <span className={`rounded px-2 py-0.5 ${statusClass}`}>{statusLabel}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-[rgb(var(--cb-text-muted))] align-top">{d.file_type ?? ''}</td>
                  <td className="px-3 py-2 align-top">
                    <select
                      className="cb-input text-xs"
                      value={d.doc_type_tag ?? ''}
                      disabled={busyDocId === d.id}
                      onChange={(e) => {
                        void updateDocType(d.id, e.target.value);
                      }}
                    >
                      <option value="">(none)</option>
                      {DOC_TYPE_TAGS.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex max-w-[360px] flex-col gap-1">
                      <div className="flex flex-wrap gap-1">
                        {(d.linked_tasks ?? []).length > 0 ? (
                          d.linked_tasks?.map((task) => (
                            <span
                              key={`${d.id}:${task.id}`}
                              className="inline-flex items-center rounded-full bg-[rgb(var(--cb-surface-muted))] px-2 py-0.5 text-[11px] text-[rgb(var(--cb-text))]"
                              title={`${task.title} (${task.status})`}
                            >
                              #{task.id} {task.title}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[rgb(var(--cb-text-muted))]">No linked tasks</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          className="cb-input h-8 text-xs"
                          value={attachTaskByDocId[d.id] ?? ''}
                          onChange={(e) => setAttachTaskByDocId((prev) => ({ ...prev, [d.id]: e.target.value }))}
                        >
                          <option value="">Attach to task…</option>
                          {tasksForAttach.map((task) => (
                            <option key={`doc-attach-${d.id}-task-${task.id}`} value={task.id}>
                              #{task.id} {task.title}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyDocId === d.id || !attachTaskByDocId[d.id]}
                          onClick={() => {
                            void attachDocToTask(d.id);
                          }}
                        >
                          Attach
                        </Button>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-[rgb(var(--cb-text-muted))] align-top">
                    {d.last_accessed_at ? new Date(d.last_accessed_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-[rgb(var(--cb-text-muted))] align-top">
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

