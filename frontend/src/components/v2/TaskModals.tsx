import { useCallback, useEffect, useState } from 'react';
import type { Assignee, Task, TaskPriority, TaskStatus } from '../../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Panel } from './ui/Panel';

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">{children}</div>;
}

export function EditTaskModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (patch: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
    tags?: string[] | string;
    assigned_to?: Assignee | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority ?? null);
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [tags, setTags] = useState(Array.isArray(task.tags) ? task.tags.join(', ') : '');
  const [assigned, setAssigned] = useState<Assignee | null>(task.assigned_to ?? null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = useCallback(async () => {
    if (saving || deleting) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || task.title,
        description: description.trim() ? description : null,
        status,
        priority,
        due_date: dueDate.trim() ? dueDate.trim() : null,
        tags,
        assigned_to: assigned,
      });
    } finally {
      setSaving(false);
    }
  }, [assigned, deleting, description, dueDate, tags, onSave, priority, saving, status, task.title, title]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Ctrl/Cmd+Enter to save from anywhere.
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, save]);

  return (
    <ModalOverlay>
      <Panel
        role="dialog"
        aria-modal="true"
        aria-label={`Edit task ${task.id}`}
        className="w-full max-w-lg p-4 shadow-[var(--cb-shadow-md)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-[rgb(var(--cb-text))]">Edit task #{task.id}</div>
            <div className="text-xs text-[rgb(var(--cb-text-muted))]">Status: {status}</div>
          </div>
          <Button variant="ghost" size="sm" className="px-2" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Title</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  save();
                }
              }}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Description</div>
            <textarea
              className="cb-input w-full"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Tags</div>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma-separated (e.g. ui, backend)" />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Status</div>
            <select
              className="cb-input w-full"
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

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Priority</div>
              <select
                className="cb-input w-full"
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

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Due date</div>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Assignee</div>
              <select
                className="cb-input w-full"
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

          <div className="mt-2 flex justify-between gap-2">
            <Button
              variant="danger"
              disabled={saving || deleting}
              onClick={async () => {
                const ok = window.confirm(`Delete task #${task.id}? This cannot be undone.`);
                if (!ok) return;
                setDeleting(true);
                try {
                  await onDelete();
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={saving || deleting} onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" disabled={saving || deleting} onClick={save}>
                Save
              </Button>
            </div>
          </div>

          <div className="text-[11px] text-[rgb(var(--cb-text-muted))]">
            Tip: <span className="font-medium">Ctrl/Cmd + Enter</span> saves. <span className="font-medium">Esc</span>{' '}
            closes.
          </div>
        </div>
      </Panel>
    </ModalOverlay>
  );
}

export function CreateTaskModal({
  initialStatus,
  onClose,
  onCreate,
}: {
  initialStatus?: TaskStatus;
  onClose: () => void;
  onCreate: (body: {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
    tags?: string[] | string;
    assigned_to?: Assignee | null;
    position?: number;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus ?? 'backlog');
  const [priority, setPriority] = useState<TaskPriority>(null);
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [assigned, setAssigned] = useState<Assignee | null>('tee');
  const [saving, setSaving] = useState(false);

  const canCreate = title.trim().length > 0 && !saving;

  const create = useCallback(async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        status,
        priority,
        due_date: dueDate.trim() ? dueDate.trim() : null,
        tags,
        assigned_to: assigned,
      });
    } finally {
      setSaving(false);
    }
  }, [assigned, description, dueDate, tags, onCreate, priority, saving, status, title]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Ctrl/Cmd+Enter to create from anywhere.
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        create();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [create, onClose]);

  return (
    <ModalOverlay>
      <Panel role="dialog" aria-modal="true" aria-label="Create task" className="w-full max-w-lg p-4 shadow-[var(--cb-shadow-md)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-[rgb(var(--cb-text))]">Create task</div>
            <div className="text-xs text-[rgb(var(--cb-text-muted))]">Fill in the basics. You can edit later.</div>
          </div>
          <Button variant="ghost" size="sm" className="px-2" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Title</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  create();
                }
              }}
              placeholder="e.g. Refactor Kanban column headers"
              autoFocus
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Description</div>
            <textarea
              className="cb-input w-full"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional…"
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Tags</div>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma-separated (e.g. ui, backend)" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Status</div>
              <select
                className="cb-input w-full"
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
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Assignee</div>
              <select
                className="cb-input w-full"
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

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Priority</div>
              <select
                className="cb-input w-full"
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

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Due date</div>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={create} disabled={!canCreate}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </div>

          <div className="text-[11px] text-[rgb(var(--cb-text-muted))]">
            Tip: <span className="font-medium">Ctrl/Cmd + Enter</span> creates. <span className="font-medium">Esc</span>{' '}
            closes.
          </div>
        </div>
      </Panel>
    </ModalOverlay>
  );
}
