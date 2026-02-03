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
import clsx from 'clsx';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { api } from '../../lib/api';
import type { Task, TaskStatus } from '../../lib/api';

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

function parseSqliteTimestamp(ts: string) {
  if (!ts) return new Date(0);
  if (ts.includes('T')) return new Date(ts);
  return new Date(ts.replace(' ', 'T') + 'Z');
}

function statusLabel(s: TaskStatus) {
  return COLUMNS.find((c) => c.key === s)?.title ?? s;
}

export function KanbanBoardV2({
  tasks,
  tasksAll,
  tasksRef,
  onSetTasks,
  onRefresh,
  onEditTask,
  onQuickAdd,
}: {
  tasks: Task[];
  tasksAll: Task[];
  tasksRef: { current: Task[] };
  onSetTasks: Dispatch<SetStateAction<Task[]>>;
  onRefresh: () => Promise<void>;
  onEditTask: (t: Task) => void;
  onQuickAdd: (status: TaskStatus) => void;
}) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };

    for (const t of tasks) {
      const bucket = map[t.status as TaskStatus];
      if (bucket) bucket.push(t);
    }

    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    return map;
  }, [tasks]);

  function findContainerForTaskId(taskId: string, columns: Record<TaskStatus, Task[]>) {
    for (const col of COLUMNS) {
      if (columns[col.key].some((t) => String(t.id) === taskId)) return col.key;
    }
    return null;
  }

  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasksAll.find((t) => String(t.id) === activeTaskId) ?? null;
  }, [activeTaskId, tasksAll]);

  function onDragOver(evt: DragOverEvent) {
    const { active, over } = evt;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainerForTaskId(activeId, byStatus);
    const overContainer = (COLUMNS.find((c) => c.key === overId)?.key ?? findContainerForTaskId(overId, byStatus)) as
      | TaskStatus
      | null;

    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    onSetTasks((prev) => {
      const aTask = prev.find((t) => String(t.id) === activeId);
      if (!aTask) return prev;
      return prev.map((t) => (String(t.id) === activeId ? { ...t, status: overContainer } : t));
    });
  }

  async function persistPositions(nextAll: Task[]) {
    const columns: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of nextAll) columns[t.status as TaskStatus]?.push(t);
    for (const k of Object.keys(columns) as TaskStatus[]) {
      columns[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      columns[k] = columns[k].map((t, idx) => ({ ...t, position: idx }));
    }

    const desired = Object.values(columns).flat();
    const updates = desired.map((t) => api.updateTask(t.id, { status: t.status as TaskStatus, position: t.position }));
    await Promise.allSettled(updates);
  }

  async function onDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    setActiveTaskId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainerForTaskId(activeId, byStatus);
    const overContainer = (COLUMNS.find((c) => c.key === overId)?.key ?? findContainerForTaskId(overId, byStatus)) as
      | TaskStatus
      | null;

    if (!activeContainer || !overContainer) return;

    // Update in the full tasks array (source-of-truth) so filters don't lose the move.
    const prevAll = tasksRef.current;
    const nextAll = [...prevAll];
    const aIdx = nextAll.findIndex((t) => String(t.id) === activeId);
    if (aIdx < 0) return;

    const aTask = nextAll[aIdx];
    nextAll[aIdx] = { ...aTask, status: overContainer };

    // Reorder within destination column if dropping on another task.
    if (overId !== overContainer) {
      const dest = nextAll
        .filter((t) => t.status === overContainer)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const fromIndex = dest.findIndex((t) => String(t.id) === activeId);
      const overIndex = dest.findIndex((t) => String(t.id) === overId);
      if (fromIndex >= 0 && overIndex >= 0 && fromIndex !== overIndex) {
        const reordered = arrayMove(dest, fromIndex, overIndex).map((t, i) => ({ ...t, position: i }));
        for (const t of reordered) {
          const idx = nextAll.findIndex((x) => x.id === t.id);
          if (idx >= 0) nextAll[idx] = t;
        }
      }
    }

    onSetTasks(nextAll);

    try {
      await persistPositions(nextAll);
    } finally {
      await onRefresh();
    }
  }

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(evt) => setActiveTaskId(String(evt.active.id))}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveTaskId(null)}
      >
        <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <KanbanColumnV2
              key={col.key}
              id={col.key}
              title={col.title}
              count={byStatus[col.key].length}
              tasks={byStatus[col.key]}
              activeTaskId={activeTaskId}
              onOpenTask={onEditTask}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>

        <DragOverlay>{activeTask ? <div className="w-80"><TaskCardV2 task={activeTask} /></div> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumnV2({
  id,
  title,
  count,
  tasks,
  activeTaskId,
  onOpenTask,
  onQuickAdd,
}: {
  id: TaskStatus;
  title: string;
  count: number;
  tasks: Task[];
  activeTaskId: string | null;
  onOpenTask: (t: Task) => void;
  onQuickAdd: (status: TaskStatus) => void;
}) {
  const showDropHint = !!activeTaskId;

  return (
    <div className="flex min-h-[20rem] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{count}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => onQuickAdd(id)}
            title={`Add to ${title}`}
            aria-label={`Add to ${title}`}
          >
            +
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            title="Menu (coming soon)"
            aria-label="Menu"
            disabled
          >
            …
          </button>
        </div>
      </div>

      <div className={clsx('relative flex-1 bg-slate-50/50 p-3', showDropHint && 'transition')}>
        {showDropHint ? (
          <div className="pointer-events-none absolute inset-2 rounded-xl border-2 border-dashed border-slate-200" />
        ) : null}

        <SortableContext items={tasks.map((t) => String(t.id))} strategy={verticalListSortingStrategy}>
          <div className="flex min-h-[18rem] flex-col gap-2">
            {tasks.map((t) => (
              <SortableTaskV2 key={t.id} task={t} onOpen={() => onOpenTask(t)} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function TaskCardV2({ task, onOpen }: { task: Task; onOpen?: () => void }) {
  const created = parseSqliteTimestamp(task.created_at);
  const createdLabel = Number.isFinite(created.getTime()) ? created.toLocaleDateString() : '';

  const statusText = statusLabel(task.status);

  return (
    <button
      type="button"
      className={clsx(
        'group w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition',
        'hover:-translate-y-px hover:border-slate-300 hover:shadow-md',
        'active:translate-y-0 active:shadow-sm',
      )}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="whitespace-normal text-sm font-semibold leading-snug text-slate-900">{task.title}</div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <span className="font-mono text-slate-500">#{task.id}</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {statusText}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-500">Assignee</span>
              <span className="font-medium text-slate-800">{task.assigned_to ?? '—'}</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <span className="text-slate-500">Created</span>
              <span className="font-medium text-slate-800" title={task.created_at}>
                {createdLabel || '—'}
              </span>
            </div>
          </div>
        </div>

        {task.priority ? (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
            {task.priority}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function SortableTaskV2({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(task.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={clsx(isDragging && 'opacity-50')} {...attributes} {...listeners}>
      <TaskCardV2 task={task} onOpen={onOpen} />
    </div>
  );
}
