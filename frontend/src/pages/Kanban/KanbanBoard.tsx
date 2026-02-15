import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { AlertTriangle, Calendar, Flag, GripVertical, Hash, User } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { api } from '../../lib/api';
import type { Task, TaskStatus } from '../../lib/api';
import { formatDate } from '../../lib/date';
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

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return isTouch;
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
}) {
  const hasSelection = selectedIds && selectedIds.size > 0;
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeRect, setActiveRect] = useState<{ width: number; height: number } | null>(null);

  const isTouch = useIsTouch();
  const dragEnabled = !isTouch;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 120, tolerance: 5 } }),
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

  async function onDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    setActiveTaskId(null);
    setActiveRect(null);
    if (!over) return;

    const activeId = String(active.id);
    const overKey = String(over.id);

    const activeContainer = findContainerForTaskId(activeId, byStatus);
    const overContainer = (COLUMNS.find((c) => c.key === overKey)?.key ?? findContainerForTaskId(overKey, byStatus)) as
      | TaskStatus
      | null;

    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    const prevAll = tasksRef.current;
    const nextAll = [...prevAll];
    const aIdx = nextAll.findIndex((t) => String(t.id) === activeId);
    if (aIdx < 0) return;

    const aTask = nextAll[aIdx];
    nextAll[aIdx] = { ...aTask, status: overContainer };
    onSetTasks(nextAll);

    try {
      await api.updateTask(aTask.id, { status: overContainer });
    } finally {
      await onRefresh();
    }
  }

  return (
    <div className="h-full">
      <DndContext
        sensors={dragEnabled ? sensors : []}
        collisionDetection={closestCorners}
        autoScroll
        onDragStart={(evt) => {
          setActiveTaskId(String(evt.active.id));
          const rect = evt.active.rect.current?.initial ?? evt.active.rect.current?.translated;
          if (rect?.width && rect?.height) setActiveRect({ width: rect.width, height: rect.height });
        }}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveTaskId(null);
          setActiveRect(null);
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
              dragEnabled={dragEnabled}
              onOpenTask={onEditTask}
              onQuickCreate={onQuickCreate}
              selectedIds={selectedIds}
              onToggleSelection={onToggleSelection}
              hasSelection={hasSelection}
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
  dragEnabled,
  onOpenTask,
  onQuickCreate,
  selectedIds,
  onToggleSelection,
  hasSelection,
}: {
  id: TaskStatus;
  title: string;
  count: number;
  tasks: Task[];
  activeTaskId: string | null;
  dragEnabled: boolean;
  onOpenTask: (t: Task) => void;
  onQuickCreate: (status: TaskStatus, title: string) => Promise<void> | void;
  selectedIds?: Set<number>;
  onToggleSelection?: (id: number) => void;
  hasSelection?: boolean;
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
        'flex min-h-[20rem] flex-col rounded-2xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface-muted))] shadow-sm transition',
        showDropHint && 'ring-1 ring-[rgb(var(--cb-accent)/0.0)] bg-[rgb(var(--cb-accent)/0.00)]',
      )}
      data-testid={`kanban-column-${id}`}
    >
      <div className="flex items-center justify-between border-b border-[rgb(var(--cb-border))] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-[rgb(var(--cb-text))]">{title}</div>
          <div className="rounded-full bg-[rgb(var(--cb-accent-soft))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--cb-text))]">{count}</div>
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
          'relative flex-1 p-3',
          showDropHint && 'ring-2 ring-[rgb(var(--cb-accent)/0.35)]',
        )}
      >
        {showDropHint ? (
          <div className="pointer-events-none absolute inset-2 rounded-xl border-2 border-dashed border-[rgb(var(--cb-accent)/0.25)] bg-[rgb(var(--cb-accent)/0.04)]" />
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

        <div className="flex min-h-[18rem] flex-col gap-2">
          {tasks.map((t) => (
            <DraggableTask
              key={t.id}
              task={t}
              onOpen={() => onOpenTask(t)}
              dragEnabled={dragEnabled}
              isSelected={selectedIds?.has(t.id)}
              onToggleSelection={onToggleSelection}
              showCheckbox={hasSelection}
            />
          ))}
        </div>
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
    dragEnabled,
    dragHandleProps,
  }: {
    task: Task;
    onOpen?: () => void;
    dragging?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (id: number) => void;
    showCheckbox?: boolean;
    dragEnabled?: boolean;
    dragHandleProps?: DragHandleProps;
  }) {
    const createdLabel = formatDate(task.created_at);
    const dueLabel = formatDate(task.due_date);

    function handleCheckboxClick(e: React.MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection?.(task.id);
    }

    return (
      <div
        data-testid={`task-card-${task.id}`}
        className={clsx(
          'group w-full rounded-xl border bg-[rgb(var(--cb-surface))] p-3 text-left shadow-sm will-change-transform',
          dragging ? 'transition-none' : 'transition',
          !dragging && 'hover:-translate-y-px hover:shadow-md',
          'active:translate-y-0 active:shadow-sm',
          'focus-within:ring-2 focus-within:ring-[rgb(var(--cb-accent)/0.45)] focus-within:ring-offset-2 focus-within:ring-offset-[rgb(var(--cb-surface))]',
          isSelected
            ? 'border-[rgb(var(--cb-accent))] ring-2 ring-[rgb(var(--cb-accent)/0.2)]'
            : 'border-[rgb(var(--cb-border))] hover:border-[rgb(var(--cb-accent)/0.18)]',
        )}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            className={clsx(
              'shrink-0 pt-0.5 transition-opacity outline-none',
              showCheckbox || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
            onClick={handleCheckboxClick}
          >
            <Checkbox checked={isSelected} size="sm" readOnly tabIndex={-1} />
          </button>

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
              'shrink-0 rounded-md p-1 text-[rgb(var(--cb-text-muted))] transition hover:text-[rgb(var(--cb-text))]',
              !dragEnabled && 'cursor-not-allowed opacity-50',
            )}
            aria-label="Drag task"
            title="Drag task"
            style={dragEnabled ? { touchAction: 'none' } : undefined}
            {...dragHandleProps}
          >
            <GripVertical size={16} />
          </button>
        </div>

        <button
          type="button"
          className="w-full mt-2 outline-none text-left"
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

          <div className="mt-3 flex flex-col gap-1.5">
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
  dragEnabled,
  isSelected,
  onToggleSelection,
  showCheckbox,
}: {
  task: Task;
  onOpen: () => void;
  dragEnabled: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: number) => void;
  showCheckbox?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(task.id),
    disabled: !dragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, scaleX: 1, scaleY: 1 } : null),
    transition: isDragging ? 'none' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx('select-none w-full', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
    >
      <TaskCard
        task={task}
        onOpen={onOpen}
        dragging={isDragging}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
        showCheckbox={showCheckbox}
        dragEnabled={dragEnabled}
        dragHandleProps={dragEnabled ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}
