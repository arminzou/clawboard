import {
  DndContext,
  DragOverlay,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { AlertTriangle, Calendar, CheckCircle2, Flag, GripVertical, Hash, User } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { api } from '../../lib/api';
import type { Task, TaskStatus } from '../../lib/api';
import { formatDate, formatDateSmart } from '../../lib/date';
import { Checkbox } from '../../components/ui/Checkbox';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { Menu } from '../../components/ui/Menu';

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

function statusLabel(s: TaskStatus) {
  return COLUMNS.find((c) => c.key === s)?.title ?? s;
}

export function KanbanBoard({
  tasks,
  tasksAll,
  tasksRef,
  onSetTasks,
  onRefresh,
  onEditTask,
  onQuickCreate,
  selectedIds,
  onToggleSelection,
  showCheckboxes,
}: {
  tasks: Task[];
  tasksAll: Task[];
  tasksRef: { current: Task[] };
  onSetTasks: Dispatch<SetStateAction<Task[]>>;
  onRefresh: () => Promise<void>;
  onEditTask: (t: Task) => void;
  onQuickCreate: (status: TaskStatus, title: string) => Promise<void> | void;
  selectedIds?: Set<number>;
  onToggleSelection?: (id: number) => void;
  showCheckboxes?: boolean;
}) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeRect, setActiveRect] = useState<{ width: number; height: number } | null>(null);
  const lastOverColumnRef = useRef<{ activeId: string; overColumn: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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

  function findContainerInList(taskId: string, list: Task[]) {
    const match = list.find((t) => String(t.id) === taskId);
    return (match?.status as TaskStatus) ?? null;
  }

  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasksAll.find((t) => String(t.id) === activeTaskId) ?? null;
  }, [activeTaskId, tasksAll]);

  async function persistPositions(prevAll: Task[], nextAll: Task[]) {
    const prevById = new Map(prevAll.map((t) => [t.id, t]));
    const updates = nextAll
      .filter((t) => {
        const p = prevById.get(t.id);
        if (!p) return true;
        return p.status !== t.status || (p.position ?? 0) !== (t.position ?? 0);
      })
      .map((t) => api.updateTask(t.id, { status: t.status as TaskStatus, position: t.position }));

    if (!updates.length) return 0;
    await Promise.allSettled(updates);
    return updates.length;
  }

  function buildNextAll(prevAll: Task[], activeId: string, overKey: string) {
    const activeContainer = findContainerInList(activeId, prevAll);
    const overContainer = (COLUMNS.find((c) => c.key === overKey)?.key ?? findContainerInList(overKey, prevAll)) as
      | TaskStatus
      | null;

    if (!activeContainer || !overContainer) return null;

    const columns: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };

    for (const t of prevAll) columns[t.status as TaskStatus]?.push(t);
    for (const k of Object.keys(columns) as TaskStatus[]) {
      columns[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    const source = [...columns[activeContainer]];
    const dest = activeContainer === overContainer ? source : [...columns[overContainer]];

    const activeIndex = source.findIndex((t) => String(t.id) === activeId);
    if (activeIndex < 0) return null;

    if (activeContainer === overContainer) {
      const overIndex = overKey === overContainer
        ? dest.length - 1
        : dest.findIndex((t) => String(t.id) === overKey);
      if (overIndex >= 0 && activeIndex !== overIndex) {
        columns[activeContainer] = arrayMove(dest, activeIndex, overIndex);
      } else {
        return null;
      }
    } else {
      const [moved] = source.splice(activeIndex, 1);
      const overIndex = overKey === overContainer
        ? dest.length
        : dest.findIndex((t) => String(t.id) === overKey);
      const insertIndex = overIndex < 0 ? dest.length : overIndex;
      const updated = { ...moved, status: overContainer };
      dest.splice(insertIndex, 0, updated);
      columns[activeContainer] = source;
      columns[overContainer] = dest;
    }

    const nextAll: Task[] = [];
    for (const k of Object.keys(columns) as TaskStatus[]) {
      columns[k] = columns[k].map((t, idx) => ({ ...t, position: idx }));
      nextAll.push(...columns[k]);
    }

    const changed = nextAll.some((t) => {
      const p = prevAll.find((x) => x.id === t.id);
      return !p || p.status !== t.status || (p.position ?? 0) !== (t.position ?? 0);
    });

    return changed ? nextAll : null;
  }

  function onDragOver(evt: DragOverEvent) {
    const { active, over } = evt;
    if (!over) return;
    const activeId = String(active.id);
    const overKey = String(over.id);
    if (activeId === overKey) return;

    const activeContainer = findContainerInList(activeId, tasksRef.current);
    const overContainer = (COLUMNS.find((c) => c.key === overKey)?.key ?? findContainerInList(overKey, tasksRef.current)) as
      | TaskStatus
      | null;

    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    if (lastOverColumnRef.current?.activeId === activeId && lastOverColumnRef.current?.overColumn === overContainer) return;
    lastOverColumnRef.current = { activeId, overColumn: overContainer };

    onSetTasks((prev) => {
      const nextAll = buildNextAll(prev, activeId, overContainer);
      if (!nextAll) return prev;
      tasksRef.current = nextAll;
      return nextAll;
    });
  }

  async function onDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    setActiveTaskId(null);
    setActiveRect(null);
    lastOverColumnRef.current = null;
    if (!over) return;

    const activeId = String(active.id);
    const overKey = String(over.id);

    const prevAll = tasksRef.current;
    const nextAll = buildNextAll(prevAll, activeId, overKey);
    if (!nextAll) return;

    onSetTasks(nextAll);

    try {
      await persistPositions(prevAll, nextAll);
    } finally {
      await onRefresh();
    }
  }

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        autoScroll
        onDragStart={(evt) => {
          setActiveTaskId(String(evt.active.id));
          lastOverColumnRef.current = null;
          const rect = evt.active.rect.current?.initial ?? evt.active.rect.current?.translated;
          if (rect?.width && rect?.height) setActiveRect({ width: rect.width, height: rect.height });
        }}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveTaskId(null);
          setActiveRect(null);
          lastOverColumnRef.current = null;
        }}
      >
        <div className="grid h-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              id={col.key}
              title={col.title}
              count={byStatus[col.key].length}
              tasks={byStatus[col.key]}
              activeTaskId={activeTaskId}
              onOpenTask={onEditTask}
              onQuickCreate={onQuickCreate}
              selectedIds={selectedIds}
              onToggleSelection={onToggleSelection}
              showCheckboxes={showCheckboxes}
            />
          ))}
        </div>

        <DragOverlay adjustScale={false}>
          {activeTask ? (
            <div style={activeRect ? { width: activeRect.width, height: activeRect.height } : undefined}>
              <TaskCard task={activeTask} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  count,
  tasks,
  activeTaskId,
  onOpenTask,
  onQuickCreate,
  selectedIds,
  onToggleSelection,
  showCheckboxes,
}: {
  id: TaskStatus;
  title: string;
  count: number;
  tasks: Task[];
  activeTaskId: string | null;
  onOpenTask: (t: Task) => void;
  onQuickCreate: (status: TaskStatus, title: string) => Promise<void> | void;
  selectedIds?: Set<number>;
  onToggleSelection?: (id: number) => void;
  showCheckboxes?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const showDropHint = !!activeTaskId && isOver;

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const quickRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!quickOpen) return;
    requestAnimationFrame(() => quickRef.current?.focus());
  }, [quickOpen]);

  async function submitQuick() {
    const trimmed = quickTitle.trim();
    if (!trimmed || quickSaving) return;

    setQuickSaving(true);
    try {
      await onQuickCreate(id, trimmed);
      setQuickTitle('');
      requestAnimationFrame(() => quickRef.current?.focus());
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <div
      className={clsx(
        'flex min-h-[20rem] flex-col rounded-xl bg-[rgb(var(--cb-surface-muted))] shadow-sm transition',
      )}
      data-testid={`kanban-column-${id}`}
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <div className="text-sm font-semibold text-[rgb(var(--cb-text))]">{title}</div>
          <div className="rounded-full bg-[rgb(var(--cb-accent-soft))] px-1.5 py-0.5 text-[11px] font-medium text-[rgb(var(--cb-text))]">{count}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-2 py-1 text-sm text-[rgb(var(--cb-text-muted))] transition hover:bg-[rgb(var(--cb-accent-soft))] hover:text-[rgb(var(--cb-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--cb-accent)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--cb-surface))]"
            onClick={() => {
              setQuickOpen((v) => !v);
              setQuickTitle('');
            }}
            title={quickOpen ? `Close quick add` : `Quick add to ${title}`}
            aria-label={quickOpen ? `Close quick add` : `Quick add to ${title}`}
          >
            {quickOpen ? '×' : '+'}
          </button>
          <Menu
            align="right"
            items={[
              {
                key: 'add',
                label: quickOpen ? 'Focus quick add' : 'Quick add task',
                onSelect: () => {
                  if (!quickOpen) setQuickOpen(true);
                  requestAnimationFrame(() => quickRef.current?.focus());
                },
              },
              {
                key: 'close',
                label: 'Close quick add',
                disabled: !quickOpen,
                onSelect: () => {
                  setQuickOpen(false);
                  setQuickTitle('');
                },
              },
            ]}
            trigger={({ toggle }) => (
              <button
                type="button"
                className="rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-2 py-1 text-sm text-[rgb(var(--cb-text-muted))] transition hover:bg-[rgb(var(--cb-accent-soft))] hover:text-[rgb(var(--cb-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--cb-accent)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--cb-surface))]"
                title="Menu"
                aria-label="Menu"
                onClick={toggle}
              >
                …
              </button>
            )}
          />
        </div>
      </div>

      <div
        ref={setNodeRef}
        data-testid={`kanban-drop-${id}`}
        className={clsx(
          'relative flex-1 p-2',
        )}
      >
        {showDropHint ? (
          <div className="pointer-events-none absolute inset-2 rounded-xl bg-[rgb(var(--cb-accent)/0.04)]" />
        ) : null}

        {quickOpen ? (
          <div className="mb-2 rounded-xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] p-2 shadow-sm">
            <Input
              ref={quickRef}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder={`Add to ${title}…`}
              disabled={quickSaving}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setQuickOpen(false);
                  setQuickTitle('');
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitQuick();
                }
              }}
            />
            <div className="mt-1 text-[11px] text-[rgb(var(--cb-text-muted))]">Enter to create · Esc to cancel</div>
          </div>
        ) : null}

        <SortableContext items={tasks.map((t) => String(t.id))} strategy={verticalListSortingStrategy}>
          <div className="flex min-h-[18rem] flex-col gap-1.5">
            {tasks.map((t) => (
              <DraggableTask
                key={t.id}
                task={t}
                onOpen={() => onOpenTask(t)}
                  isSelected={selectedIds?.has(t.id)}
                onToggleSelection={onToggleSelection}
                showCheckbox={showCheckboxes}
              />
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
    <div className="flex items-center justify-between gap-3 text-xs text-[rgb(var(--cb-text-muted))]" title={title}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[rgb(var(--cb-text-muted))] group-hover:text-[rgb(var(--cb-text))]">{icon}</span>
        <span className="truncate group-hover:text-[rgb(var(--cb-text))]">{label}</span>
      </div>
      <span className={clsx('shrink-0 font-medium text-[rgb(var(--cb-text))]', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

type DragHandleProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const TaskCard = memo(
  function TaskCard({
    task,
    onOpen,
    dragging,
    isSelected,
    onToggleSelection,
    showCheckbox,
    dragHandleProps,
  }: {
    task: Task;
    onOpen?: () => void;
    dragging?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (id: number) => void;
    showCheckbox?: boolean;
    dragHandleProps?: DragHandleProps;
  }) {
    const createdLabel = formatDateSmart(task.created_at);
    const dueLabel = formatDate(task.due_date);
    const completedLabel = formatDateSmart(task.completed_at);

    function handleCheckboxClick(e: React.MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection?.(task.id);
    }

    return (
      <div
        data-testid={`task-card-${task.id}`}
        className={clsx(
          'group w-full rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] p-2 text-left shadow-sm will-change-transform',
          dragging ? 'transition-none shadow-lg ring-1 ring-[rgb(var(--cb-border))]' : 'transition',
          isSelected ? 'ring-2 ring-[rgb(var(--cb-accent)/0.2)]' : '',
        )}
      >
        <div className="flex items-start gap-2">
          {showCheckbox || isSelected ? (
            <button
              type="button"
              className="shrink-0 pt-0.5 outline-none"
              onClick={handleCheckboxClick}
            >
              <Checkbox checked={isSelected} size="sm" readOnly tabIndex={-1} />
            </button>
          ) : null}

          <button
            type="button"
            className="min-w-0 flex-1 whitespace-normal line-clamp-2 text-sm font-semibold leading-snug text-[rgb(var(--cb-text))] outline-none text-left"
            onClick={onOpen}
          >
            {task.title}
          </button>

          <button
            type="button"
            data-testid={`task-drag-handle-${task.id}`}
            className={clsx(
              'shrink-0 rounded-md p-1 text-[rgb(var(--cb-text-muted))] transition hover:text-[rgb(var(--cb-text))] cursor-grab active:cursor-grabbing'
            )}
            aria-label="Drag task"
            title="Drag task"
            {...dragHandleProps}
          >
            <GripVertical size={16} />
          </button>
        </div>

        <button
          type="button"
          className="w-full mt-1.5 outline-none text-left"
          onClick={onOpen}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={statusChipClasses(task.status)}>{statusLabel(task.status)}</span>
            {task.priority ? <span className={priorityChipClasses(task.priority)}>{task.priority}</span> : null}
            {task.blocked_reason ? (
              <Chip variant="neutral" className="text-[11px] py-0.5" title={task.blocked_reason}>
                blocked
              </Chip>
            ) : null}
            {Array.isArray(task.tags) && task.tags.length
              ? task.tags.slice(0, 3).map((t) => (
                  <Chip key={t} variant="neutral" className="text-[11px] py-0.5">
                    {t}
                  </Chip>
                ))
              : null}
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <MetaRow icon={<Hash size={14} />} label="Task ID" value={`#${task.id}`} mono />
            <MetaRow icon={<User size={14} />} label="Assignee" value={task.assigned_to ?? '—'} />
            {task.context_key ? (
              <MetaRow
                icon={<span className="text-[10px] font-bold opacity-70">CTX</span>}
                label={task.context_type ?? 'context'}
                value={task.context_key}
              />
            ) : null}
            {task.blocked_reason ? <MetaRow icon={<AlertTriangle size={14} />} label="Blocked" value="Yes" title={task.blocked_reason} /> : null}
            {task.due_date ? <MetaRow icon={<Flag size={14} />} label="Due" value={dueLabel || '—'} title={task.due_date} /> : null}
            <MetaRow icon={<Calendar size={14} />} label="Created" value={createdLabel || '—'} title={task.created_at} />
            {task.completed_at ? <MetaRow icon={<CheckCircle2 size={14} />} label="Completed" value={completedLabel || '—'} title={task.completed_at} /> : null}
          </div>
        </button>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.dragging === next.dragging &&
      prev.isSelected === next.isSelected &&
      prev.showCheckbox === next.showCheckbox &&
      prev.task.id === next.task.id &&
      prev.task.updated_at === next.task.updated_at &&
      prev.task.status === next.task.status &&
      prev.task.position === next.task.position
    );
  }
);

function DraggableTask({
  task,
  onOpen,
  isSelected,
  onToggleSelection,
  showCheckbox,
}: {
  task: Task;
  onOpen: () => void;
  isSelected?: boolean;
  onToggleSelection?: (id: number) => void;
  showCheckbox?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(task.id),
  });

  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, scaleX: 1, scaleY: 1 } : null),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx('select-none w-full')}
    >
      <TaskCard
        task={task}
        onOpen={onOpen}
        dragging={isDragging}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
        showCheckbox={showCheckbox}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
