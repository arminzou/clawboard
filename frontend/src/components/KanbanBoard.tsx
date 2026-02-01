import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { api, Task, TaskStatus } from '../lib/api';

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-slate-900">{task.title}</div>
        {task.priority ? (
          <span className={clsx('rounded px-2 py-0.5 text-xs', {
            'bg-slate-100 text-slate-700': task.priority === 'low',
            'bg-blue-100 text-blue-800': task.priority === 'medium',
            'bg-amber-100 text-amber-800': task.priority === 'high',
            'bg-red-100 text-red-800': task.priority === 'urgent',
          })}>
            {task.priority}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-slate-600">
        #{task.id} • {task.assigned_to ?? 'unassigned'}
      </div>
      {task.description ? <div className="mt-2 text-sm text-slate-700">{task.description}</div> : null}
    </div>
  );
}

export function KanbanBoard({ wsSignal }: { wsSignal?: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function refresh() {
    setLoading(true);
    try {
      const all = await api.listTasks();
      setTasks(all);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // re-fetch on websocket signals
  useEffect(() => {
    if (!wsSignal) return;
    // cheap + reliable for now
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsSignal?.type]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  async function onDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    setActiveTask(null);
    if (!over) return;

    const taskId = Number(active.id);
    const overId = String(over.id);

    // overId is either column key or task id; we set droppables as columns only
    const nextStatus = COLUMNS.find((c) => c.key === overId)?.key as TaskStatus | undefined;
    if (!nextStatus) return;

    const current = tasks.find((t) => t.id === taskId);
    if (!current || current.status === nextStatus) return;

    // optimistic
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)));
    try {
      await api.updateTask(taskId, { status: nextStatus });
    } catch (e) {
      // rollback
      await refresh();
      throw e;
    }
  }

  async function createQuickTask() {
    const title = prompt('Task title?');
    if (!title) return;
    const created = await api.createTask({ title, status: 'backlog', assigned_to: 'tee' });
    setTasks((prev) => [created, ...prev]);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Kanban</h2>
          <div className="text-sm text-slate-600">Drag tasks between columns. (Reordering coming next.)</div>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={createQuickTask}
          >
            + Task
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

      <DndContext
        sensors={sensors}
        onDragStart={(evt) => {
          const t = tasks.find((x) => x.id === Number(evt.active.id)) ?? null;
          setActiveTask(t);
        }}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className="flex min-h-[20rem] flex-col rounded-lg border border-slate-200 bg-slate-50"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <div className="font-medium text-slate-900">{col.title}</div>
                <div className="text-xs text-slate-600">{byStatus[col.key].length}</div>
              </div>
              <div id={col.key} className="p-3">
                <SortableContext items={[]} strategy={verticalListSortingStrategy}>
                  <div
                    className={clsx('flex min-h-[18rem] flex-col gap-2 rounded-md p-1', 'bg-transparent')}
                    // droppable id: use the column key
                    // DndKit: easiest is set as droppable via useDroppable, but for MVP we can use "id" on container with <div>??
                  />
                </SortableContext>
                <div
                  className="flex min-h-[18rem] flex-col gap-2"
                  // Over target is the column itself; DndContext uses collision detection; we set the "over" via a Droppable.
                />
              </div>

              {/* Use a simple droppable by relying on over id = column key via a hidden element */}
              <ColumnDropzone id={col.key}>
                <div className="flex flex-col gap-2 p-3 pt-0">
                  {byStatus[col.key].map((t) => (
                    <DraggableTask key={t.id} task={t} />
                  ))}
                </div>
              </ColumnDropzone>
            </div>
          ))}
        </div>

        <DragOverlay>{activeTask ? <TaskCard task={activeTask} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';

function ColumnDropzone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={clsx('flex-1', isOver && 'ring-2 ring-slate-400')}>
      {children}
    </div>
  );
}

function DraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(task.id) });

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(isDragging && 'opacity-50')}
      {...listeners}
      {...attributes}
    >
      <TaskCard task={task} />
    </div>
  );
}
