import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import type { Assignee, Task, TaskStatus } from '../../lib/api';
import { KanbanBoardV2 } from './KanbanBoardV2';
import { CreateTaskModal, EditTaskModal } from './TaskModals';
import { AppShellV2 } from './layout/AppShellV2';
import { SidebarV2 } from './layout/SidebarV2';
import { TopbarV2, type TopbarMode } from './layout/TopbarV2';
// import { TaskTableV2 } from './TaskTableV2'; // (unused)

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

type ViewFilter = 'all' | TaskStatus;

type AssigneeFilter = 'all' | 'tee' | 'fay' | 'armin' | '';

type DueFilter = 'any' | 'overdue' | 'soon' | 'has' | 'none';

type TagFilter = 'all' | (string & {});

type SavedView = {
  id: string;
  name: string;
  filters: {
    view: ViewFilter;
    assignee: AssigneeFilter;
    hideDone: boolean;
    showArchived: boolean;
    due: DueFilter;
    tag: TagFilter;
    q: string;
  };
};

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

  const [showArchived, setShowArchived] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('cb.v2.kanban.showArchived') === '1';
    } catch {
      return false;
    }
  });

  const [due, setDue] = useState<DueFilter>(() => {
    try {
      const raw = window.localStorage.getItem('cb.v2.kanban.due') ?? 'any';
      return (raw === 'any' || raw === 'overdue' || raw === 'soon' || raw === 'has' || raw === 'none' ? raw : 'any') as DueFilter;
    } catch {
      return 'any';
    }
  });

  const [tag, setTag] = useState<TagFilter>(() => {
    try {
      const raw = window.localStorage.getItem('cb.v2.kanban.tag') ?? 'all';
      return (raw?.trim() ? raw.trim() : 'all') as TagFilter;
    } catch {
      return 'all';
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

  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    try {
      const raw = window.localStorage.getItem('cb.v2.kanban.savedViews');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x) => typeof x === 'object' && x !== null)
        .map((x) => x as SavedView)
        .filter((x) => typeof x.id === 'string' && typeof x.name === 'string' && typeof x.filters === 'object' && x.filters);
    } catch {
      return [];
    }
  });

  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const lastAppliedFiltersRef = useRef<SavedView['filters'] | null>(null);

  const [mode, setMode] = useState<TopbarMode>(() => {
    try {
      const raw = window.localStorage.getItem('cb.v2.kanban.mode') ?? 'board';
      return raw === 'table' ? 'table' : 'board';
    } catch {
      return 'board';
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
      const all = await api.listTasks({ include_archived: showArchived });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

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
      window.localStorage.setItem('cb.v2.kanban.showArchived', showArchived ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showArchived]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.due', due);
    } catch {
      // ignore
    }
  }, [due]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.tag', tag);
    } catch {
      // ignore
    }
  }, [tag]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.assignee', assignee);
    } catch {
      // ignore
    }
  }, [assignee]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.mode', mode);
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.q', q);
    } catch {
      // ignore
    }
  }, [q]);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.kanban.savedViews', JSON.stringify(savedViews));
    } catch {
      // ignore
    }
  }, [savedViews]);

  // If user tweaks filters after applying a saved view, clear the active marker.
  useEffect(() => {
    if (!activeSavedViewId) return;
    const applied = lastAppliedFiltersRef.current;
    if (!applied) return;

    const now = { view, assignee, hideDone, showArchived, due, tag, q };
    const same =
      now.view === applied.view &&
      now.assignee === applied.assignee &&
      now.hideDone === applied.hideDone &&
      now.showArchived === applied.showArchived &&
      now.due === applied.due &&
      now.tag === applied.tag &&
      now.q === applied.q;

    if (!same) setActiveSavedViewId(null);
  }, [assignee, hideDone, q, showArchived, due, tag, view, activeSavedViewId]);

  function applySavedView(id: string) {
    const sv = savedViews.find((x) => x.id === id);
    if (!sv) return;

    const rawDue = (sv.filters as Partial<SavedView['filters']> | undefined)?.due;
    const normalizedDue: DueFilter =
      rawDue === 'any' || rawDue === 'overdue' || rawDue === 'soon' || rawDue === 'has' || rawDue === 'none'
        ? rawDue
        : 'any';

    const rawTag = (sv.filters as Partial<SavedView['filters']> | undefined)?.tag;
    const normalizedTag = typeof rawTag === 'string' && rawTag.trim() ? rawTag.trim() : 'all';

    const filters: SavedView['filters'] = {
      view: (sv.filters?.view ?? 'all') as ViewFilter,
      assignee: (sv.filters?.assignee ?? 'all') as AssigneeFilter,
      hideDone: Boolean(sv.filters?.hideDone),
      showArchived: Boolean(sv.filters?.showArchived),
      due: normalizedDue,
      tag: normalizedTag as TagFilter,
      q: (sv.filters?.q ?? '') as string,
    };

    lastAppliedFiltersRef.current = filters;
    setActiveSavedViewId(sv.id);

    setView(filters.view);
    setAssignee(filters.assignee);
    setHideDone(filters.hideDone);
    setShowArchived(filters.showArchived);
    setDue(filters.due);
    setTag(filters.tag);
    setQ(filters.q);
  }

  function saveCurrentView() {
    const name = window.prompt('Save current view as…');
    const trimmed = name?.trim();
    if (!trimmed) return;

    const filters: SavedView['filters'] = { view, assignee, hideDone, showArchived, due, tag, q };
    const id = `sv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    const next: SavedView = { id, name: trimmed, filters };
    setSavedViews((prev) => [...prev, next]);

    lastAppliedFiltersRef.current = filters;
    setActiveSavedViewId(id);
  }

  function deleteSavedView(id: string) {
    const sv = savedViews.find((x) => x.id === id);
    if (!sv) return;

    const ok = window.confirm(`Delete saved view "${sv.name}"?`);
    if (!ok) return;

    setSavedViews((prev) => prev.filter((x) => x.id !== id));
    if (activeSavedViewId === id) {
      setActiveSavedViewId(null);
      lastAppliedFiltersRef.current = null;
    }
  }

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

      const t = String(wsSignal.type);
      if (t.startsWith('task_') || t.startsWith('tasks_')) {
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
    const wantTag = (tag ?? 'all') === 'all' ? 'all' : String(tag);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const soonEnd = new Date(startOfToday);
    soonEnd.setDate(soonEnd.getDate() + 7);

    function parseDueDate(raw: string): Date | null {
      if (!raw) return null;
      const d = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
      if (!Number.isFinite(d.getTime())) return null;
      return d;
    }

    return tasks.filter((t) => {
      if (wantAssignee !== 'all' && (t.assigned_to ?? null) !== wantAssignee) return false;
      if (wantTag !== 'all' && !(Array.isArray(t.tags) && t.tags.includes(wantTag))) return false;
      if (hideDone && t.status === 'done') return false;

      if (due !== 'any') {
        const dueAt = parseDueDate(String(t.due_date ?? '').trim());
        const hasDue = !!dueAt;

        if (due === 'has' && !hasDue) return false;
        if (due === 'none' && hasDue) return false;

        if (due === 'overdue') {
          if (!hasDue) return false;
          if ((dueAt as Date) >= startOfToday) return false;
        }

        if (due === 'soon') {
          if (!hasDue) return false;
          if ((dueAt as Date) < startOfToday) return false;
          if ((dueAt as Date) > soonEnd) return false;
        }
      }

      if (!query) return true;
      const hay = `${t.title}\n${t.description ?? ''}\n${t.id}\n${t.status}\n${t.assigned_to ?? ''}\n${Array.isArray(t.tags) ? t.tags.join(' ') : ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [assignee, tag, hideDone, q, tasks, due]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (!Array.isArray(t.tags)) continue;
      for (const raw of t.tags) {
        const s = String(raw).trim();
        if (s) set.add(s);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

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
      savedViews={savedViews.map((sv) => ({ id: sv.id, name: sv.name }))}
      activeSavedViewId={activeSavedViewId}
      onApplySavedView={applySavedView}
      onSaveCurrentView={saveCurrentView}
      onDeleteSavedView={deleteSavedView}
      assignee={assignee}
      onAssignee={setAssignee}
      hideDone={hideDone}
      onHideDone={setHideDone}
      due={due}
      onDue={setDue}
      tag={tag}
      tagOptions={tagOptions}
      onTag={setTag}
      showArchived={showArchived}
      onShowArchived={setShowArchived}
      onArchiveDone={async () => {
        const scopeLabel = assignee === 'all' ? 'all assignees' : assignee === '' ? 'unassigned only' : assignee;
        const ok = window.confirm(`Archive all done tasks (${scopeLabel})?`);
        if (!ok) return;

        const body = assignee === 'all' ? undefined : { assigned_to: assignee === '' ? null : (assignee as Assignee) };
        await api.archiveDone(body);
        await refresh();
      }}
      onReset={() => {
        setQ('');
        setAssignee('all');
        setView('all');
        setHideDone(false);
        setShowArchived(false);
        setDue('any');
        setTag('all');
      }}
    />
  );

  const topbar = (
    <TopbarV2
      boardName={boardName}
      mode={mode}
      onMode={setMode}
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
            onQuickCreate={async (status, title) => {
              const trimmed = title.trim();
              if (!trimmed) return;

              const assignedTo: Assignee | null =
                assignee === 'all' ? 'tee' : assignee === '' ? null : (assignee as Assignee);

              const maxPos = Math.max(
                -1,
                ...tasksRef.current
                  .filter((t) => t.status === status)
                  .map((t) => (t.position ?? 0) as number),
              );

              await api.createTask({
                title: trimmed,
                status,
                assigned_to: assignedTo,
                position: maxPos + 1,
              });
              await refresh();
            }}
          />
        </div>
      </AppShellV2>

      {editTask ? (
        <EditTaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={async (patch) => {
            const normalizedTags =
              typeof patch.tags === 'string'
                ? patch.tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                : patch.tags;

            await api.updateTask(editTask.id, { ...patch, tags: normalizedTags });
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
            const normalizedTags =
              typeof body.tags === 'string'
                ? body.tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                : body.tags;

            await api.createTask({ ...body, tags: normalizedTags });
            setCreateOpen(false);
            setCreatePrefill(null);
            await refresh();
          }}
        />
      ) : null}
    </>
  );
}
