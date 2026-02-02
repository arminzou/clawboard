import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { api } from '../lib/api';
import type { Assignee, Task, TaskPriority, TaskStatus } from '../lib/api';

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

function TaskCard({ task, onOpen }: { task: Task; onOpen?: () => void }) {
  return (
    <button
      type="button"
      className="w-full rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-slate-300"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-slate-900">{task.title}</div>
        {task.priority ? (
          <span
            className={clsx('rounded px-2 py-0.5 text-xs', {
              'bg-slate-100 text-slate-700': task.priority === 'low',
              'bg-blue-100 text-blue-800': task.priority === 'medium',
              'bg-amber-100 text-amber-800': task.priority === 'high',
              'bg-red-100 text-red-800': task.priority === 'urgent',
            })}
          >
            {task.priority}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-slate-600">
        #{task.id} • {task.assigned_to ?? 'unassigned'}
      </div>
      {task.description ? <div className="mt-2 text-sm text-slate-700">{task.description}</div> : null}
    </button>
  );
}

export function KanbanBoard({
  wsSignal,
  openTaskId,
  onOpenTaskConsumed,
}: {
  wsSignal?: { type?: string; data?: unknown } | null;
  openTaskId?: number | null;
  onOpenTaskConsumed?: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  type AssigneeFilter = 'all' | 'tee' | 'fay' | 'armin' | '';

  const [q, setQ] = useState(() => {
    try {
      return window.localStorage.getItem('pm.kanban.q') ?? '';
    } catch {
      return '';
    }
  });

  const [assignee, setAssignee] = useState<AssigneeFilter>(() => {
    try {
      const raw = window.localStorage.getItem('pm.kanban.assignee') ?? 'all';
      return (raw === 'all' || raw === 'tee' || raw === 'fay' || raw === 'armin' || raw === '' ? raw : 'all') as AssigneeFilter;
    } catch {
      return 'all';
    }
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const searchRef = useRef<HTMLInputElement | null>(null);

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
    try {
      window.localStorage.setItem('pm.kanban.q', q);
    } catch {
      // ignore
    }
  }, [q]);

  useEffect(() => {
    try {
      window.localStorage.setItem('pm.kanban.assignee', assignee);
    } catch {
      // ignore
    }
  }, [assignee]);

  // If App requests to open a task (e.g. from Activity tab), open the edit modal.
  useEffect(() => {
    if (!openTaskId) return;
    const t = tasks.find((x) => x.id === openTaskId);
    if (!t) return;
    setEditTask(t);
    onOpenTaskConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTaskId, tasks]);

  // Keyboard shortcuts (Kanban tab only)
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

  // Apply websocket updates in-memory (fallback to refresh for unknown shapes)
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
        // unknown task_* event: stay correct by refetching
        refresh();
      }
    } catch {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsSignal?.type]);

  const visibleTasks = useMemo(() => {
    const query = q.trim().toLowerCase();
    const wantAssignee: Assignee | 'all' = assignee === 'all' ? 'all' : assignee === '' ? null : assignee;

    return tasks.filter((t) => {
      if (wantAssignee !== 'all' && (t.assigned_to ?? null) !== wantAssignee) return false;
      if (!query) return true;
      const hay = `${t.title}\n${t.description ?? ''}\n${t.id}\n${t.status}\n${t.assigned_to ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [assignee, q, tasks]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };
    const unknown: Task[] = [];

    for (const t of visibleTasks) {
      const bucket = map[t.status as TaskStatus];
      if (bucket) bucket.push(t);
      else unknown.push(t);
    }

    // Ensure consistent ordering even if API returns a mixed sort
    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    return {
      map,
      unknown: Array.from(new Set(unknown.map((t) => t.status))),
    };
  }, [visibleTasks]);

  function findContainerForTaskId(taskId: string, columns: Record<TaskStatus, Task[]>) {
    for (const col of COLUMNS) {
      if (columns[col.key].some((t) => String(t.id) === taskId)) return col.key;
    }
    return null;
  }

  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasks.find((t) => String(t.id) === activeTaskId) ?? null;
  }, [activeTaskId, tasks]);

  // Optimistic move across columns while dragging
  function onDragOver(evt: DragOverEvent) {
    const { active, over } = evt;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainerForTaskId(activeId, byStatus.map);
    const overContainer = (COLUMNS.find((c) => c.key === overId)?.key ?? findContainerForTaskId(overId, byStatus.map)) as
      | TaskStatus
      | null;

    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    setTasks((prev) => {
      const aTask = prev.find((t) => String(t.id) === activeId);
      if (!aTask) return prev;
      // update status; positions will be normalized on drop
      return prev.map((t) => (String(t.id) === activeId ? { ...t, status: overContainer } : t));
    });
  }

  async function persistPositions(next: Task[]) {
    // Persist positions per column (0..n) and any status changes.
    // This is chatty (many PATCHes) but simple + reliable for a personal tool.
    const columns: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of next) columns[t.status as TaskStatus]?.push(t);
    for (const k of Object.keys(columns) as TaskStatus[]) {
      columns[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      // rewrite positions based on current ordering
      columns[k] = columns[k].map((t, idx) => ({ ...t, position: idx }));
    }

    const desired = Object.values(columns).flat();

    const updates = desired
      .map((t) => {
        const before = tasks.find((x) => x.id === t.id);
        const changed = !before || before.status !== t.status || (before.position ?? 0) !== (t.position ?? 0);
        if (!changed) return null;
        return api.updateTask(t.id, { status: t.status as TaskStatus, position: t.position });
      })
      .filter(Boolean) as Promise<unknown>[];

    await Promise.allSettled(updates);
  }

  async function onDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    setActiveTaskId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainerForTaskId(activeId, byStatus.map);
    const overContainer = (COLUMNS.find((c) => c.key === overId)?.key ?? findContainerForTaskId(overId, byStatus.map)) as
      | TaskStatus
      | null;

    if (!activeContainer || !overContainer) return;

    let nextLocal: Task[] | null = null;

    setTasks((prev) => {
      const next = [...prev];
      const aIdx = next.findIndex((t) => String(t.id) === activeId);
      if (aIdx < 0) return prev;

      const activeTask = next[aIdx];
      const updatedActive = { ...activeTask, status: overContainer };
      next[aIdx] = updatedActive;

      // If dropping on another task, reorder within the destination column
      if (overId !== overContainer) {
        const dest = next
          .filter((t) => t.status === overContainer)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const fromIndex = dest.findIndex((t) => String(t.id) === activeId);
        const overIndex = dest.findIndex((t) => String(t.id) === overId);
        if (fromIndex >= 0 && overIndex >= 0 && fromIndex !== overIndex) {
          const reordered = arrayMove(dest, fromIndex, overIndex).map((t, i) => ({ ...t, position: i }));
          const merged = next.map((t) => {
            const rep = reordered.find((x) => x.id === t.id);
            return rep ? rep : t;
          });
          nextLocal = merged;
          return merged;
        }
      }

      nextLocal = next;
      return next;
    });

    // Persist after we computed nextLocal.
    try {
      if (nextLocal) await persistPositions(nextLocal);
    } finally {
      await refresh();
    }
  }

  // Create via UI modal (see CreateTaskModal below)

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Kanban</h2>
          <div className="text-sm text-slate-600">Drag tasks between columns. Drag within a column to reorder.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={searchRef}
            className="w-56 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Search tasks… (/)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value as AssigneeFilter)}
            title="Assignee"
          >
            <option value="all">All</option>
            <option value="tee">tee</option>
            <option value="fay">fay</option>
            <option value="armin">armin</option>
            <option value="">(unassigned)</option>
          </select>
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => setCreateOpen(true)}
          >
            + Task (N)
          </button>
          <button
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            onClick={refresh}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? <div className="text-sm text-slate-600">Loading…</div> : null}
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Failed to load tasks: {error}
        </div>
      ) : null}
      {byStatus.unknown.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Unknown task statuses from API: {byStatus.unknown.join(', ')}
        </div>
      ) : null}

      {!loading && visibleTasks.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          No tasks match your filters.
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(evt) => setActiveTaskId(String(evt.active.id))}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveTaskId(null)}
      >
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              id={col.key}
              title={col.title}
              count={byStatus.map[col.key].length}
              tasks={byStatus.map[col.key]}
              onOpenTask={(t) => setEditTask(t)}
            />
          ))}
        </div>

        <DragOverlay>{activeTask ? <div className="w-80"><TaskCard task={activeTask} /></div> : null}</DragOverlay>
      </DndContext>

      {editTask ? (
        <EditTaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={async (patch) => {
            await api.updateTask(editTask.id, patch);
            setEditTask(null);
            await refresh();
          }}
        />
      ) : null}

      {createOpen ? (
        <CreateTaskModal
          onClose={() => setCreateOpen(false)}
          onCreate={async (body) => {
            await api.createTask(body);
            setCreateOpen(false);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

import { useDroppable } from '@dnd-kit/core';

function KanbanColumn({
  id,
  title,
  count,
  tasks,
  onOpenTask,
}: {
  id: TaskStatus;
  title: string;
  count: number;
  tasks: Task[];
  onOpenTask: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex min-h-[20rem] flex-col rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="font-medium text-slate-900">{title}</div>
        <div className="text-xs text-slate-600">{count}</div>
      </div>
      <div ref={setNodeRef} className={clsx('flex-1 p-3', isOver && 'ring-2 ring-slate-400')}>
        <SortableContext items={tasks.map((t) => String(t.id))} strategy={verticalListSortingStrategy}>
          <div className="flex min-h-[18rem] flex-col gap-2">
            {tasks.map((t) => (
              <SortableTask key={t.id} task={t} onOpen={() => onOpenTask(t)} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function SortableTask({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(task.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={clsx(isDragging && 'opacity-50')} {...attributes} {...listeners}>
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}

function EditTaskModal({
  task,
  onClose,
  onSave,
}: {
  task: Task;
  onClose: () => void;
  onSave: (patch: { title?: string; description?: string | null; priority?: TaskPriority; assigned_to?: Assignee | null }) => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority ?? null);
  const [assigned, setAssigned] = useState<Assignee | null>(task.assigned_to ?? null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Edit task #{task.id}</div>
            <div className="text-xs text-slate-500">Status: {task.status}</div>
          </div>
          <button className="rounded-md px-2 py-1 text-sm hover:bg-slate-100" onClick={onClose}>✕</button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Title</div>
            <input className="w-full rounded-md border border-slate-200 px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Description</div>
            <textarea className="w-full rounded-md border border-slate-200 px-3 py-2" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-slate-600">Priority</div>
              <select className="w-full rounded-md border border-slate-200 px-3 py-2" value={priority ?? ''} onChange={(e) => setPriority((e.target.value || null) as TaskPriority)}>
                <option value="">(none)</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-slate-600">Assignee</div>
              <select className="w-full rounded-md border border-slate-200 px-3 py-2" value={assigned ?? ''} onChange={(e) => setAssigned((e.target.value || null) as Assignee)}>
                <option value="">(unassigned)</option>
                <option value="tee">tee</option>
                <option value="fay">fay</option>
                <option value="armin">armin</option>
              </select>
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave({
                    title: title.trim() || task.title,
                    description: description.trim() ? description : null,
                    priority,
                    assigned_to: assigned,
                  });
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (body: {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigned_to?: Assignee | null;
    position?: number;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('backlog');
  const [priority, setPriority] = useState<TaskPriority>(null);
  const [assigned, setAssigned] = useState<Assignee | null>('tee');
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Create task</div>
            <div className="text-xs text-slate-500">Fill in the basics. You can edit later.</div>
          </div>
          <button className="rounded-md px-2 py-1 text-sm hover:bg-slate-100" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Title</div>
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wire up docs sync UI"
              autoFocus
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Description</div>
            <textarea
              className="w-full rounded-md border border-slate-200 px-3 py-2"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional…"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-slate-600">Status</div>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-slate-600">Assignee</div>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2"
                value={assigned ?? ''}
                onChange={(e) => setAssigned((e.target.value || null) as Assignee)}
              >
                <option value="">(unassigned)</option>
                <option value="tee">tee</option>
                <option value="fay">fay</option>
                <option value="armin">armin</option>
              </select>
            </label>
          </div>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Priority</div>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2"
              value={priority ?? ''}
              onChange={(e) => setPriority((e.target.value || null) as TaskPriority)}
            >
              <option value="">(none)</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <button
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={!canSave}
              onClick={async () => {
                if (!title.trim()) return;
                setSaving(true);
                try {
                  await onCreate({
                    title: title.trim(),
                    description: description.trim() ? description.trim() : null,
                    status,
                    priority,
                    assigned_to: assigned,
                  });
                } finally {
                  setSaving(false);
                }
              }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
