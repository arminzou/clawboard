import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import type { Assignee, Task, TaskStatus } from '../../lib/api';
import { KanbanBoardV2 } from './KanbanBoardV2';
import { CreateTaskModal, EditTaskModal } from './TaskModals';

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

type ViewFilter = 'all' | TaskStatus;

type AssigneeFilter = 'all' | 'tee' | 'fay' | 'armin' | '';

export function KanbanPageV2({
  wsSignal,
  openTaskId,
  onOpenTaskConsumed,
}: {
  wsSignal?: { type?: string; data?: unknown } | null;
  openTaskId?: number | null;
  onOpenTaskConsumed?: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<ViewFilter>(() => {
    try {
      const raw = window.localStorage.getItem('cb.v2.kanban.view') ?? 'all';
      return (raw === 'all' || raw === 'backlog' || raw === 'in_progress' || raw === 'review' || raw === 'done' ? raw : 'all') as ViewFilter;
    } catch {
      return 'all';
    }
  });

  const [hideDone, setHideDone] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('cb.v2.kanban.hideDone') === '1';
    } catch {
      return false;
    }
  });

  const [assignee, setAssignee] = useState<AssigneeFilter>(() => {
    try {
      const raw = window.localStorage.getItem('cb.v2.kanban.assignee') ?? 'all';
      return (raw === 'all' || raw === 'tee' || raw === 'fay' || raw === 'armin' || raw === '' ? raw : 'all') as AssigneeFilter;
    } catch {
      return 'all';
    }
  });

  const [q, setQ] = useState(() => {
    try {
      return window.localStorage.getItem('cb.v2.kanban.q') ?? '';
    } catch {
      return '';
    }
  });

  const searchRef = useRef<HTMLInputElement | null>(null);

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<{ status?: TaskStatus } | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const all = await api.listTasks();
      setTasks(all);
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
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.view', view);
    } catch {
      // ignore
    }
  }, [view]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.hideDone', hideDone ? '1' : '0');
    } catch {
      // ignore
    }
  }, [hideDone]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.assignee', assignee);
    } catch {
      // ignore
    }
  }, [assignee]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.q', q);
    } catch {
      // ignore
    }
  }, [q]);

  // Open task requested from elsewhere (e.g. Activity tab)
  useEffect(() => {
    if (!openTaskId) return;
    const t = tasks.find((x) => x.id === openTaskId);
    if (!t) return;
    setEditTask(t);
    onOpenTaskConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTaskId, tasks]);

  // WS updates (simple in-memory apply)
  useEffect(() => {
    if (!wsSignal?.type) return;

    try {
      if (wsSignal.type === 'task_created' && wsSignal.data) {
        const t = wsSignal.data as Task;
        setTasks((prev) => {
          if (prev.some((x) => x.id === t.id)) return prev;
          return [t, ...prev];
        });
        return;
      }

      if (wsSignal.type === 'task_updated' && wsSignal.data) {
        const t = wsSignal.data as Task;
        setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
        return;
      }

      if (wsSignal.type === 'task_deleted' && wsSignal.data) {
        const data = wsSignal.data;
        if (typeof data === 'object' && data !== null && 'id' in data) {
          const id = Number((data as { id: unknown }).id);
          setTasks((prev) => prev.filter((x) => x.id !== id));
          return;
        }
      }

      if (String(wsSignal.type).startsWith('task_')) {
        refresh();
      }
    } catch {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsSignal?.type]);

  const baseFiltered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const wantAssignee: Assignee | 'all' = assignee === 'all' ? 'all' : assignee === '' ? null : assignee;

    return tasks.filter((t) => {
      if (wantAssignee !== 'all' && (t.assigned_to ?? null) !== wantAssignee) return false;
      if (hideDone && t.status === 'done') return false;

      if (!query) return true;
      const hay = `${t.title}\n${t.description ?? ''}\n${t.id}\n${t.status}\n${t.assigned_to ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [assignee, hideDone, q, tasks]);

  const viewCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      backlog: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };
    for (const t of baseFiltered) {
      if (counts[t.status as TaskStatus] != null) counts[t.status as TaskStatus] += 1;
    }
    return counts;
  }, [baseFiltered]);

  const visibleTasks = useMemo(() => {
    if (view === 'all') return baseFiltered;
    return baseFiltered.filter((t) => t.status === view);
  }, [baseFiltered, view]);

  const projectName = 'Clawboard';
  const boardName = 'Tasks';

  return (
    <div className="flex h-full">
      {/* Secondary sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</div>
              <div className="mt-1 text-base font-semibold text-slate-900">{projectName}</div>
            </div>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              title="New board (coming soon)"
              disabled
            >
              +
            </button>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Views</div>
            <div className="mt-2 flex flex-col gap-1">
              <ViewButton active={view === 'all'} label="All" count={baseFiltered.length} onClick={() => setView('all')} />
              {COLUMNS.map((c) => (
                <ViewButton
                  key={c.key}
                  active={view === c.key}
                  label={c.title}
                  count={viewCounts[c.key]}
                  onClick={() => setView(c.key)}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filters</div>

            <label className="mt-2 text-sm">
              <div className="mb-1 text-xs font-medium text-slate-600">Assignee</div>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value as AssigneeFilter)}
              >
                <option value="all">All</option>
                <option value="tee">tee</option>
                <option value="fay">fay</option>
                <option value="armin">armin</option>
                <option value="">(unassigned)</option>
              </select>
            </label>

            <label className="mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
              <span>Hide done</span>
              <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            </label>

            <button
              type="button"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={() => {
                setQ('');
                setAssignee('all');
                setView('all');
                setHideDone(false);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex flex-1 flex-col bg-slate-50">
        {/* Top toolbar */}
        <header className="border-b border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">{boardName}</div>
                <div className="text-xs text-slate-500">Board</div>
              </div>

              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm"
                  title="Board"
                >
                  Board
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white"
                  title="Table (coming soon)"
                  disabled
                >
                  Table
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <input
                  ref={searchRef}
                  className="w-64 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Search… (/)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q ? (
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                    onClick={() => setQ('')}
                    title="Clear"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <button
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
                onClick={() => {
                  setCreatePrefill(null);
                  setCreateOpen(true);
                }}
              >
                + Add
              </button>

              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                onClick={refresh}
                title="Refresh"
              >
                ⟳
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {loading ? <div className="text-sm text-slate-600">Loading…</div> : null}
          {error ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Failed to load tasks: {error}
            </div>
          ) : null}

          {!loading && visibleTasks.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
              No tasks match your filters.
            </div>
          ) : null}

          <div className={clsx('h-full', (loading || error) && 'mt-3')}>
            <KanbanBoardV2
              tasks={visibleTasks}
              tasksAll={tasks}
              tasksRef={tasksRef}
              onSetTasks={setTasks}
              onRefresh={refresh}
              onEditTask={(t) => setEditTask(t)}
              onQuickAdd={(status) => {
                setCreatePrefill({ status });
                setCreateOpen(true);
              }}
            />
          </div>
        </div>

        {editTask ? (
          <EditTaskModal
            task={editTask}
            onClose={() => setEditTask(null)}
            onSave={async (patch) => {
              await api.updateTask(editTask.id, patch);
              setEditTask(null);
              await refresh();
            }}
            onDelete={async () => {
              await api.deleteTask(editTask.id);
              setEditTask(null);
              await refresh();
            }}
          />
        ) : null}

        {createOpen ? (
          <CreateTaskModal
            initialStatus={createPrefill?.status}
            onClose={() => {
              setCreateOpen(false);
              setCreatePrefill(null);
            }}
            onCreate={async (body) => {
              await api.createTask(body);
              setCreateOpen(false);
              setCreatePrefill(null);
              await refresh();
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

function ViewButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? 'flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white'
          : 'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50'
      }
      onClick={onClick}
    >
      <span>{label}</span>
      <span className={active ? 'rounded-full bg-white/15 px-2 py-0.5 text-xs' : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700'}>
        {count}
      </span>
    </button>
  );
}
