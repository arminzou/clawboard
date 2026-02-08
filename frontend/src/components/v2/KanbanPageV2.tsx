import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import type { Assignee, Task, TaskStatus } from '../../lib/api';
import { toast } from '../../lib/toast';
import { BulkActionBar } from './BulkActionBar';
import { KanbanBoardV2 } from './KanbanBoardV2';
import { KeyboardHelpModal } from './KeyboardHelpModal';
import { CreateTaskModal, EditTaskModal } from './TaskModals';
import { AppShellV2 } from './layout/AppShellV2';
import { SidebarV2 } from './layout/SidebarV2';
import { TopbarV2, type TopbarMode } from './layout/TopbarV2';
import { TaskTableV2 } from './TaskTableV2';
import { ToastContainer } from './ui/Toast';
import { useProjects } from '../../hooks/useProjects';

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
    blocked: boolean;
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
  // Project management
  const { projects, currentProjectId, currentProject, setCurrentProjectId } = useProjects();

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

  const [blocked, setBlocked] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('cb.v2.kanban.blocked') === '1';
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('cb.v2.sidebar.collapsed') === '1';
    } catch {
      return false;
    }
  });

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<{ status?: TaskStatus } | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const overdueCount = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return tasks.filter((t) => {
      if (t.status === 'done' || !t.due_date) return false;
      const dueAt = new Date(t.due_date.includes('T') ? t.due_date : `${t.due_date}T00:00:00`);
      return dueAt < startOfToday;
    }).length;
  }, [tasks]);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Clear selection when tasks change significantly (e.g., after delete)
  useEffect(() => {
    setSelectedIds((prev) => {
      const taskIds = new Set(tasks.map((t) => t.id));
      const next = new Set<number>();
      for (const id of prev) {
        if (taskIds.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [tasks]);

  async function handleBulkAssign(assignee: Assignee | null) {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => api.updateTask(id, { assigned_to: assignee })));
    clearSelection();
    await refresh();
  }

  async function handleBulkStatus(status: TaskStatus) {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => api.updateTask(id, { status })));
    clearSelection();
    await refresh();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => api.deleteTask(id)));
    clearSelection();
    await refresh();
  }

  async function handleBulkDuplicate() {
    const ids = Array.from(selectedIds);
    const tasksToDuplicate = tasks.filter((t) => ids.includes(t.id));
    await Promise.all(tasksToDuplicate.map((t) => api.duplicateTask(t)));
    clearSelection();
    await refresh();
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const params: { include_archived?: boolean; project_id?: number } = { include_archived: showArchived };
      if (currentProjectId) {
        params.project_id = currentProjectId;
      }
      const all = await api.listTasks(params);
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
  }, [showArchived, currentProjectId]);

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

      // Clear bulk selection with Escape
      if (e.key === 'Escape') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          clearSelection();
        }
      }

      // Show keyboard shortcuts help with ?
      if (e.key === '?') {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIds.size, clearSelection]);

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
      window.localStorage.setItem('cb.v2.kanban.blocked', blocked ? '1' : '0');
    } catch {
      // ignore
    }
  }, [blocked]);

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

    const now = { view, assignee, hideDone, blocked, showArchived, due, tag, q };
    const same =
      now.view === applied.view &&
      now.assignee === applied.assignee &&
      now.hideDone === applied.hideDone &&
      now.blocked === applied.blocked &&
      now.showArchived === applied.showArchived &&
      now.due === applied.due &&
      now.tag === applied.tag &&
      now.q === applied.q;

    if (!same) setActiveSavedViewId(null);
  }, [assignee, hideDone, blocked, q, showArchived, due, tag, view, activeSavedViewId]);

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
      blocked: Boolean(sv.filters?.blocked),
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
    setBlocked(filters.blocked);
    setShowArchived(filters.showArchived);
    setDue(filters.due);
    setTag(filters.tag);
    setQ(filters.q);
  }

  function saveCurrentView() {
    const name = window.prompt('Save current view as…');
    const trimmed = name?.trim();
    if (!trimmed) return;

    const filters: SavedView['filters'] = { view, assignee, hideDone, blocked, showArchived, due, tag, q };
    const id = `sv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    const next: SavedView = { id, name: trimmed, filters };
    setSavedViews((prev) => [...prev, next]);

    lastAppliedFiltersRef.current = filters;
    setActiveSavedViewId(id);
    toast.success(`View "${trimmed}" saved`);
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
    toast.show(`View "${sv.name}" deleted`);
  }

  function renameSavedView(id: string) {
    const sv = savedViews.find((x) => x.id === id);
    if (!sv) return;

    const newName = window.prompt('Rename view:', sv.name);
    const trimmed = newName?.trim();
    if (!trimmed || trimmed === sv.name) return;

    setSavedViews((prev) =>
      prev.map((x) => (x.id === id ? { ...x, name: trimmed } : x))
    );
    toast.success(`View renamed to "${trimmed}"`);
  }

  function updateSavedViewFilters(id: string) {
    const sv = savedViews.find((x) => x.id === id);
    if (!sv) return;

    const ok = window.confirm(`Update "${sv.name}" with current filters?`);
    if (!ok) return;

    const filters: SavedView['filters'] = { view, assignee, hideDone, blocked, showArchived, due, tag, q };
    setSavedViews((prev) =>
      prev.map((x) => (x.id === id ? { ...x, filters } : x))
    );
    lastAppliedFiltersRef.current = filters;
    setActiveSavedViewId(id);
    toast.success(`View "${sv.name}" filters updated`);
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

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.sidebar.collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

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
      if (blocked && !t.blocked_reason) return false;

      if (due !== 'any') {
        const dueAt = parseDueDate(String(t.due_date ?? '').trim());
        const hasDue = !!dueAt;

        if (due === 'has' && !hasDue) return false;
        if (due === 'none' && hasDue) return false;

        if (due === 'overdue') {
          if (!hasDue) return false;
          if (dueAt! >= startOfToday) return false;
        }

        if (due === 'soon') {
          if (!hasDue) return false;
          if (dueAt! < startOfToday) return false;
          if (dueAt! > soonEnd) return false;
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

  const projectName = currentProject?.name ?? (currentProjectId === null ? 'All Projects' : 'Clawboard');
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
      projects={projects}
      currentProjectId={currentProjectId}
      onProjectChange={setCurrentProjectId}
      collapsed={sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
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
      onRenameSavedView={renameSavedView}
      onUpdateSavedViewFilters={updateSavedViewFilters}
      assignee={assignee}
      onAssignee={setAssignee}
      hideDone={hideDone}
      onHideDone={setHideDone}
      blocked={blocked}
      onBlocked={setBlocked}
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
        setBlocked(false);
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
        {overdueCount > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                !
              </span>
              <span className="font-medium">
                {overdueCount} task{overdueCount === 1 ? ' is' : 's are'} overdue.
              </span>
            </div>
            <button
              onClick={() => {
                setDue('overdue');
                setView('all');
              }}
              className="text-xs font-semibold uppercase tracking-wider text-red-600 hover:text-red-700 hover:underline"
            >
              View all
            </button>
          </div>
        )}
        {loading ? <div className="text-sm text-[rgb(var(--cb-text-muted))]">Loading…</div> : null}
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div>Failed to load tasks: {error}</div>
            <div className="mt-2">
              <button
                type="button"
                className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200"
                onClick={refresh}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {!loading && visibleTasks.length === 0 ? (
          <div className="rounded-xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] p-3 text-sm text-[rgb(var(--cb-text-muted))]">
            No tasks match your filters.
          </div>
        ) : null}

        <div className={clsx((loading || error) && 'mt-3')}>
          {mode === 'table' ? (
            <TaskTableV2
              tasks={visibleTasks}
              onOpen={(t) => {
                setEditTask(t);
              }}
            />
          ) : (
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
                  project_id: currentProjectId ?? undefined,
                });
                await refresh();
              }}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
            />
          )}
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
          onDuplicate={async () => {
            await api.duplicateTask(editTask);
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

            await api.createTask({ ...body, tags: normalizedTags, project_id: currentProjectId ?? undefined });
            setCreateOpen(false);
            setCreatePrefill(null);
            await refresh();
          }}
        />
      ) : null}

      {selectedIds.size > 0 ? (
        <BulkActionBar
          count={selectedIds.size}
          onClearSelection={clearSelection}
          onBulkAssign={handleBulkAssign}
          onBulkStatus={handleBulkStatus}
          onBulkDelete={handleBulkDelete}
          onBulkDuplicate={handleBulkDuplicate}
        />
      ) : null}

      {showKeyboardHelp ? (
        <KeyboardHelpModal onClose={() => setShowKeyboardHelp(false)} />
      ) : null}

      <ToastContainer />
    </>
  );
}
