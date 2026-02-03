import { useState } from 'react';
import type { Assignee, Task, TaskPriority, TaskStatus } from '../../lib/api';

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

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
    assigned_to?: Assignee | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority ?? null);
  const [assigned, setAssigned] = useState<Assignee | null>(task.assigned_to ?? null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Edit task #{task.id}</div>
            <div className="text-xs text-slate-500">Status: {status}</div>
          </div>
          <button className="rounded-xl px-2 py-1 text-sm hover:bg-slate-100" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Title</div>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Description</div>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Status</div>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
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
              <div className="mb-1 text-xs font-medium text-slate-600">Priority</div>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
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
              <div className="mb-1 text-xs font-medium text-slate-600">Assignee</div>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
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
            <button
              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
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
            </button>

            <div className="flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                onClick={onClose}
                disabled={saving || deleting}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={saving || deleting}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onSave({
                      title: title.trim() || task.title,
                      description: description.trim() ? description : null,
                      status,
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
    </div>
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
    assigned_to?: Assignee | null;
    position?: number;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus ?? 'backlog');
  const [priority, setPriority] = useState<TaskPriority>(null);
  const [assigned, setAssigned] = useState<Assignee | null>('tee');
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Create task</div>
            <div className="text-xs text-slate-500">Fill in the basics. You can edit later.</div>
          </div>
          <button className="rounded-xl px-2 py-1 text-sm hover:bg-slate-100" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Title</div>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Refactor Kanban column headers"
              autoFocus
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-slate-600">Description</div>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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
