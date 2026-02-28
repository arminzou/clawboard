import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { api, type Task, type TaskStatus, type TaskPriority } from '../../lib/api';
import { Checkbox } from '../../components/ui/Checkbox';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EditTaskModal } from '../Kanban/TaskModals';
import { formatDate } from '../../lib/date';
import { toast } from '../../lib/toast';

type StatusFilter = 'all' | 'backlog' | 'done';
type SortMode = 'created' | 'due';

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function InboxPage({ wsSignal }: { wsSignal?: { type?: string; data?: unknown } | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('created');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inboxTasks, tags] = await Promise.all([
        api.listTasks({ non_agent: true }),
        api.listTags(),
      ]);
      setTasks(inboxTasks);
      setTagOptions(tags);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const type = String(wsSignal?.type || '');
    if (!type) return;
    if (type.startsWith('task_') || type.startsWith('tasks_')) {
      void refresh();
    }
  }, [refresh, wsSignal]);

  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'done') return task.status === 'done';
      return task.status !== 'done';
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortMode === 'due') {
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        if (aDue !== bDue) return aDue - bDue;
      }

      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      return bCreated - aCreated;
    });

    return sorted;
  }, [sortMode, statusFilter, tasks]);

  async function createQuickTask() {
    const title = quickTitle.trim();
    if (!title || creating) return;

    setCreating(true);
    try {
      await api.createTask({
        title,
        status: 'backlog',
        non_agent: true,
      });
      setQuickTitle('');
      await refresh();
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(`Failed to create task: ${message}`);
    } finally {
      setCreating(false);
    }
  }

  async function toggleDone(task: Task) {
    const nextStatus: TaskStatus = task.status === 'done' ? 'backlog' : 'done';
    try {
      await api.updateTask(task.id, { status: nextStatus });
      await refresh();
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(`Failed to update task #${task.id}: ${message}`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="rounded-2xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              value={quickTitle}
              placeholder="Add a reminder to inbox..."
              onChange={(event) => setQuickTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                void createQuickTask();
              }}
              disabled={creating}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            disabled={!quickTitle.trim() || creating}
            onClick={() => {
              void createQuickTask();
            }}
            className="sm:w-auto"
          >
            <Plus size={16} />
            {creating ? 'Adding...' : 'Add'}
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs font-medium text-[rgb(var(--cb-text-muted))]">
            Status
            <Select
              className="mt-1"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">All</option>
              <option value="backlog">Open only</option>
              <option value="done">Done only</option>
            </Select>
          </label>
          <label className="text-xs font-medium text-[rgb(var(--cb-text-muted))]">
            Sort
            <Select
              className="mt-1"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="created">Newest first</option>
              <option value="due">Due date</option>
            </Select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] shadow-sm">
        {loading ? <div className="p-4 text-sm text-[rgb(var(--cb-text-muted))]">Loading inbox…</div> : null}
        {error ? <div className="p-4 text-sm text-red-600">Failed to load inbox: {error}</div> : null}

        {!loading && !error && visibleTasks.length === 0 ? (
          <div className="p-6 text-sm text-[rgb(var(--cb-text-muted))]">No inbox tasks yet.</div>
        ) : null}

        <ul className="divide-y divide-[rgb(var(--cb-border))]">
          {visibleTasks.map((task) => (
            <li key={task.id} className="px-4 py-3">
              <button
                type="button"
                className="flex w-full items-start gap-3 text-left"
                onClick={() => setEditTask(task)}
              >
                <span
                  className="pt-0.5"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <Checkbox
                    checked={task.status === 'done'}
                    onChange={() => {
                      void toggleDone(task);
                    }}
                    aria-label={`Toggle task ${task.id}`}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${task.status === 'done' ? 'line-through text-[rgb(var(--cb-text-muted))]' : 'text-[rgb(var(--cb-text))]'}`}>
                    {task.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[rgb(var(--cb-text-muted))]">
                    <span>#{task.id}</span>
                    {task.due_date ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={12} />
                        {formatDate(task.due_date)}
                      </span>
                    ) : null}
                    {Array.isArray(task.tags) && task.tags.length > 0 ? (
                      <span>{task.tags.join(', ')}</span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {editTask ? (
        <EditTaskModal
          task={editTask}
          tagOptions={tagOptions}
          onClose={() => setEditTask(null)}
          onSave={async (patch: {
            title?: string;
            description?: string | null;
            status?: TaskStatus;
            priority?: TaskPriority;
            due_date?: string | null;
            tags?: string[] | string;
            assigned_to_type?: 'agent' | 'human' | null;
            assigned_to_id?: string | null;
            non_agent?: boolean;
            anchor?: string | null;
            blocked_reason?: string | null;
            project_id?: number | null;
            is_someday?: boolean;
          }) => {
            const normalizedTags = typeof patch.tags === 'string'
              ? patch.tags
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              : patch.tags;
            try {
              await api.updateTask(editTask.id, { ...patch, tags: normalizedTags });
              setEditTask(null);
              await refresh();
            } catch (err) {
              const message = toErrorMessage(err);
              setError(message);
              toast.error(`Failed to save task #${editTask.id}: ${message}`);
            }
          }}
          onDelete={async () => {
            try {
              await api.deleteTask(editTask.id);
              setEditTask(null);
              await refresh();
            } catch (err) {
              const message = toErrorMessage(err);
              setError(message);
              toast.error(`Failed to delete task #${editTask.id}: ${message}`);
            }
          }}
        />
      ) : null}
    </div>
  );
}
