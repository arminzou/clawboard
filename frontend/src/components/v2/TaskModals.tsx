import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Assignee, Task, TaskPriority, TaskStatus } from '../../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Panel } from './ui/Panel';
import { Select } from './ui/Select';

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    // Skip elements that are not actually focusable in the layout.
    if (el.hasAttribute('disabled')) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return true;
  });
}

function useFocusTrap({
  containerRef,
  active,
  onEscape,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  active: boolean;
  onEscape?: () => void;
}) {
  const focusables = useMemo(() => {
    const el = containerRef.current;
    if (!active || !el) return [] as HTMLElement[];
    return getFocusableElements(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const containerEl = container;

    const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Ensure focus starts inside the modal.
    queueMicrotask(() => {
      const targets = getFocusableElements(containerEl);
      (targets[0] ?? containerEl).focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const targets = getFocusableElements(containerEl);
      if (targets.length === 0) {
        e.preventDefault();
        containerEl.focus();
        return;
      }

      const first = targets[0];
      const last = targets[targets.length - 1];
      const current = document.activeElement;

      if (e.shiftKey) {
        if (current === first || !containerEl.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (current === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function onFocusIn(e: FocusEvent) {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (containerEl.contains(target)) return;

      const targets = getFocusableElements(containerEl);
      (targets[0] ?? containerEl).focus();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      queueMicrotask(() => prevFocus?.focus());
    };
  }, [active, containerRef, onEscape, focusables]);
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      {children}
    </div>
  );
}

export function EditTaskModal({
  task,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
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
    blocked_reason?: string | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
  onDuplicate?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [activeField, setActiveField] = useState<'title' | 'description' | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap({ containerRef: modalRef, active: true, onEscape: onClose });
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority ?? null);
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [tags, setTags] = useState(Array.isArray(task.tags) ? task.tags.join(', ') : '');
  const [assigned, setAssigned] = useState<Assignee | null>(task.assigned_to ?? null);
  const [blockedReason, setBlockedReason] = useState(task.blocked_reason ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const save = useCallback(async () => {
    if (saving || deleting) return;
    setSaving(true);
    try {
      // Return focus to the previously focused element after closing.
      const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      await onSave({
        title: title.trim() || task.title,
        description: description.trim() ? description : null,
        status,
        priority,
        due_date: dueDate.trim() ? dueDate.trim() : null,
        tags,
        assigned_to: assigned,
        blocked_reason: blockedReason.trim() ? blockedReason : null,
      });
      queueMicrotask(() => prev?.focus());
    } finally {
      setSaving(false);
    }
  }, [assigned, blockedReason, deleting, description, dueDate, tags, onSave, priority, saving, status, task.title, title]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd+Enter to save from anywhere.
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save]);

  // Focus is handled by the focus trap + per-field focus effect below.

  useEffect(() => {
    if (activeField === 'title') {
      queueMicrotask(() => document.querySelector<HTMLInputElement>('input')?.focus());
    } else if (activeField === 'description') {
      queueMicrotask(() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus());
    }
  }, [activeField]);

  return (
    <ModalOverlay onClose={onClose}>
      <div ref={modalRef} tabIndex={-1} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-lg">
        <Panel
          role="dialog"
          aria-modal="true"
          aria-label={`Edit task ${task.id}`}
          className="w-full p-4 shadow-[var(--cb-shadow-md)]"
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
              onFocus={() => setActiveField('title')}
              autoFocus
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
              onFocus={() => setActiveField('description')}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Tags</div>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma-separated (e.g. ui, backend)" />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Blocked reason</div>
            <textarea
              className="cb-input w-full"
              rows={2}
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              placeholder="Optional…"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Status</div>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Priority</div>
              <Select
                value={priority ?? ''}
                onChange={(e) => setPriority((e.target.value || null) as TaskPriority)}
              >
                <option value="">(none)</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </Select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Due date</div>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Assignee</div>
              <Select
                value={assigned ?? ''}
                onChange={(e) => setAssigned((e.target.value || null) as Assignee)}
              >
                <option value="">(unassigned)</option>
                <option value="tee">tee</option>
                <option value="fay">fay</option>
                <option value="armin">armin</option>
              </Select>
            </label>
          </div>

          <div className="mt-2 flex justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={saving || deleting || duplicating}
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

              {onDuplicate ? (
                <Button
                  variant="secondary"
                  disabled={saving || deleting || duplicating}
                  onClick={async () => {
                    setDuplicating(true);
                    try {
                      await onDuplicate();
                    } finally {
                      setDuplicating(false);
                    }
                  }}
                >
                  {duplicating ? 'Duplicating…' : 'Duplicate'}
                </Button>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={saving || deleting || duplicating} onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" disabled={saving || deleting || duplicating} onClick={save}>
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
      </div>
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
    blocked_reason?: string | null;
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
  const [blockedReason, setBlockedReason] = useState('');
  const [assigned, setAssigned] = useState<Assignee | null>('tee');
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap({ containerRef: modalRef, active: true, onEscape: onClose });

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
        blocked_reason: blockedReason.trim() ? blockedReason : null,
        assigned_to: assigned,
      });
    } finally {
      setSaving(false);
    }
  }, [assigned, blockedReason, description, dueDate, tags, onCreate, priority, saving, status, title]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd+Enter to create from anywhere.
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        create();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [create]);

  return (
    <ModalOverlay onClose={onClose}>
      <div ref={modalRef} tabIndex={-1} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-lg">
        <Panel role="dialog" aria-modal="true" aria-label="Create task" className="w-full p-4 shadow-[var(--cb-shadow-md)]">
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

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Blocked reason</div>
            <textarea
              className="cb-input w-full"
              rows={2}
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              placeholder="Optional…"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Status</div>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Priority</div>
              <Select
                value={priority ?? ''}
                onChange={(e) => setPriority((e.target.value || null) as TaskPriority)}
              >
                <option value="">(none)</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </Select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Due date</div>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Assignee</div>
              <Select
                value={assigned ?? ''}
                onChange={(e) => setAssigned((e.target.value || null) as Assignee)}
              >
                <option value="">(unassigned)</option>
                <option value="tee">tee</option>
                <option value="fay">fay</option>
                <option value="armin">armin</option>
              </Select>
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
      </div>
    </ModalOverlay>
  );
}
