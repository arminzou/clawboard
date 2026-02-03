import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import type { Assignee, Task, TaskStatus } from '../../lib/api';
import { KanbanBoardV2 } from './KanbanBoardV2';
import { CreateTaskModal, EditTaskModal } from './TaskModals';
import { AppShellV2 } from './layout/AppShellV2';
import { SidebarV2 } from './layout/SidebarV2';
import { TopbarV2 } from './layout/TopbarV2';

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

  const [viewsOpen, setViewsOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('cb.v2.sidebar.viewsOpen') !== '0';
    } catch {
      return true;
    }
  });

  const [filtersOpen, setFiltersOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('cb.v2.sidebar.filtersOpen') !== '0';
    } catch {
      return true;
    }
  });

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

  // Keyboard shortcuts (Kanban only)
  useEffect(() => {
    function isEditable(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isEditable(e.target)) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setCreatePrefill(null);
        setCreateOpen(true);
      }

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.sidebar.viewsOpen', viewsOpen ? '1' : '0');
    } catch {
      // ignore
    }
  }, [viewsOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.sidebar.filtersOpen', filtersOpen ? '1' : '0');
    } catch {
      // ignore
    }
  }, [filtersOpen]);

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

  const viewItems = useMemo(
    () => [
      { key: 'all' as const, label: 'All', count: baseFiltered.length },
      ...COLUMNS.map((c) => ({ key: c.key, label: c.title, count: viewCounts[c.key] })),
    ],
    [baseFiltered.length, viewCounts],
  );

  const sidebar = (
    <SidebarV2
      projectName={projectName}
      viewsOpen={viewsOpen}
      onToggleViewsOpen={() => setViewsOpen((v) => !v)}
      filtersOpen={filtersOpen}
      onToggleFiltersOpen={() => setFiltersOpen((v) => !v)}
      view={view}
      onView={setView}
      viewItems={viewItems}
      assignee={assignee}
      onAssignee={setAssignee}
      hideDone={hideDone}
      onHideDone={setHideDone}
      onReset={() => {
        setQ('');
        setAssignee('all');
        setView('all');
        setHideDone(false);
      }}
    />
  );

  const topbar = (
    <TopbarV2
      boardName={boardName}
      q={q}
      onQ={setQ}
      searchRef={searchRef}
      onCreate={() => {
        setCreatePrefill(null);
        setCreateOpen(true);
      }}
      onRefresh={refresh}
    />
  );

  return (
    <>
      <AppShellV2 sidebar={sidebar} topbar={topbar}>
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

        <div className={clsx((loading || error) && 'mt-3')}>
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
      </AppShellV2>

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
    </>
  );
}
