import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
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
  const { setNodeRef, isOver } = useDroppable({ id });
  const showDropHint = isOver && !!activeTaskId;

  return (
    <div className="flex min-h-[20rem] flex-col rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
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

      <div
        ref={setNodeRef}
        className={clsx(
          'relative flex-1 p-3 transition',
          showDropHint && 'ring-2 ring-slate-300',
        )}
      >
        {showDropHint ? (
          <div className="pointer-events-none absolute inset-2 rounded-xl border-2 border-dashed border-slate-200 bg-white/20" />
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

function statusChipClasses(status: TaskStatus) {
  return clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', {
    'bg-slate-100 text-slate-700 ring-slate-200': status === 'backlog',
    'bg-indigo-100 text-indigo-800 ring-indigo-200': status === 'in_progress',
    'bg-purple-100 text-purple-800 ring-purple-200': status === 'review',
    'bg-emerald-100 text-emerald-800 ring-emerald-200': status === 'done',
  });
}

function priorityChipClasses(priority: Task['priority']) {
  return clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', {
    'bg-slate-100 text-slate-700 ring-slate-200': priority === 'low',
    'bg-blue-100 text-blue-800 ring-blue-200': priority === 'medium',
    'bg-amber-100 text-amber-900 ring-amber-200': priority === 'high',
    'bg-red-100 text-red-800 ring-red-200': priority === 'urgent',
  });
}

function MetaRow({
  icon,
  label,
  value,
  title,
  mono,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  title?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-slate-600" title={title}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <span className={clsx('shrink-0 font-medium text-slate-800', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

function TaskCardV2({ task, onOpen }: { task: Task; onOpen?: () => void }) {
  const created = parseSqliteTimestamp(task.created_at);
  const createdLabel = Number.isFinite(created.getTime()) ? created.toLocaleDateString() : '';

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
      <div className="whitespace-normal text-sm font-semibold leading-snug text-slate-900">{task.title}</div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={statusChipClasses(task.status)}>{statusLabel(task.status)}</span>
        {task.priority ? <span className={priorityChipClasses(task.priority)}>{task.priority}</span> : null}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <MetaRow icon={<IconHash />} label="Task ID" value={`#${task.id}`} mono />
        <MetaRow icon={<IconUser />} label="Assignee" value={task.assigned_to ?? '—'} />
        <MetaRow icon={<IconCalendar />} label="Created" value={createdLabel || '—'} title={task.created_at} />
      </div>
    </button>
  );
}

function IconHash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 9h14M4 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 4l-2 16M16 4l-2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M4 7h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M4 11h16" stroke="currentColor" strokeWidth="2" />
    </svg>
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
