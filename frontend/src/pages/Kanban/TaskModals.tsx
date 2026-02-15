import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Assignee, Task, TaskPriority, TaskStatus } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { Panel } from '../../components/ui/Panel';
import { Select } from '../../components/ui/Select';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
];

function normalizeTag(value: string): string {
  return value.trim();
}

function mergeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of tags) {
    const t = normalizeTag(raw);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(t);
  }
  return next;
}

function hasTag(tags: string[], tag: string): boolean {
  const target = normalizeTag(tag).toLowerCase();
  if (!target) return false;
  return tags.some((t) => t.toLowerCase() === target);
}

// tag toggling handled by TagPicker

function TagPicker({
  availableTags,
  value,
  onChange,
  placeholder = 'Search or add tag',
}: {
  availableTags: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeTag(query);
  const selected = useMemo(() => mergeTags(value), [value]);
  const options = useMemo(() => mergeTags(availableTags), [availableTags]);

  const filteredOptions = useMemo(() => {
    const needle = normalizedQuery.toLowerCase();
    return options
      .filter((tag) => !hasTag(selected, tag))
      .filter((tag) => !needle || tag.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [normalizedQuery, options, selected]);

  const canCreate =
    normalizedQuery.length > 0 && !hasTag(options, normalizedQuery) && !hasTag(selected, normalizedQuery);

  function addTag(tag: string) {
    const normalized = normalizeTag(tag);
    if (!normalized) return;
    onChange(mergeTags([...selected, normalized]));
    setQuery('');
  }

  function removeTag(tag: string) {
    onChange(selected.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
  }

  return (
    <div className="flex flex-col gap-2">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <Chip key={tag} variant="soft" className="pr-1">
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="rounded-full px-1 text-[10px] text-[rgb(var(--cb-text-muted))] transition hover:text-[rgb(var(--cb-text))]"
              >
                ×
              </button>
            </Chip>
          ))}
        </div>
      ) : (
        <div className="text-xs text-[rgb(var(--cb-text-muted))]">No tags selected.</div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {filteredOptions.map((tag) => (
          <button
            key={tag}
            type="button"
            className="transition hover:scale-[1.02]"
            onClick={() => addTag(tag)}
            title={`Add tag ${tag}`}
          >
            <Chip variant="neutral">{tag}</Chip>
          </button>
        ))}
        {canCreate ? (
          <Button size="sm" variant="secondary" onClick={() => addTag(normalizedQuery)}>
            Create “{normalizedQuery}”
          </Button>
        ) : null}
      </div>

      {filteredOptions.length === 0 && !canCreate ? (
        <div className="text-xs text-[rgb(var(--cb-text-muted))]">No matches.</div>
      ) : null}
    </div>
  );
}

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
  tagOptions = [],
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
  tagOptions?: string[];
}) {
  const [title, setTitle] = useState(task.title);
  const [activeField, setActiveField] = useState<'title' | 'description' | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap({ containerRef: modalRef, active: true, onEscape: onClose });
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority ?? null);
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [tags, setTags] = useState<string[]>(Array.isArray(task.tags) ? task.tags : []);
  const [assigned, setAssigned] = useState<Assignee | null>(task.assigned_to ?? null);
  const [blockedReason, setBlockedReason] = useState(task.blocked_reason ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const availableTags = useMemo(() => mergeTags(tagOptions), [tagOptions]);
  const selectedTags = useMemo(() => mergeTags(tags), [tags]);

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
        tags: selectedTags,
        assigned_to: assigned,
        blocked_reason: blockedReason.trim() ? blockedReason : null,
      });
      queueMicrotask(() => prev?.focus());
    } finally {
      setSaving(false);
    }
  }, [assigned, blockedReason, deleting, description, dueDate, onSave, priority, saving, selectedTags, status, task.title, title]);

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
          <div className="flex-1">
            <div className="text-base font-semibold text-[rgb(var(--cb-text))]">Edit task #{task.id}</div>
            <div className="text-xs text-[rgb(var(--cb-text-muted))]">Status: {status}</div>
          </div>
          
          <div className="flex items-center gap-1 -mr-1 -mt-1">
            <Button
              variant="ghost-danger"
              size="icon"
              disabled={saving || deleting}
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </Button>

            <div className="mx-1 h-4 w-px bg-[rgb(var(--cb-border))]" />

            <Button variant="ghost" size="sm" className="px-2" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>
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
            <TagPicker availableTags={availableTags} value={tags} onChange={setTags} />
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

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-[rgb(var(--cb-border))] pt-4">
            <Button variant="primary" className="w-full sm:w-auto" disabled={saving || deleting} onClick={save}>
              Save Changes
            </Button>
          </div>

          <div className="text-[11px] text-[rgb(var(--cb-text-muted))]">
            Tip: <span className="font-medium">Ctrl/Cmd + Enter</span> saves. <span className="font-medium">Esc</span>{' '}
            closes.
          </div>
        </div>
        </Panel>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Task"
          message={`Are you sure you want to delete task #${task.id}? This action cannot be undone.`}
          confirmLabel={deleting ? 'Deleting...' : 'Delete Task'}
          onConfirm={async () => {
            setDeleting(true);
            try {
              await onDelete();
            } finally {
              setDeleting(false);
              setShowDeleteConfirm(false);
            }
          }}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </ModalOverlay>
  );
}

export function CreateTaskModal({
  initialStatus,
  onClose,
  onCreate,
  tagOptions = [],
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
  tagOptions?: string[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus ?? 'backlog');
  const [priority, setPriority] = useState<TaskPriority>(null);
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [blockedReason, setBlockedReason] = useState('');
  const [assigned, setAssigned] = useState<Assignee | null>('tee');
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap({ containerRef: modalRef, active: true, onEscape: onClose });

  const availableTags = useMemo(() => mergeTags(tagOptions), [tagOptions]);
  const selectedTags = useMemo(() => mergeTags(tags), [tags]);

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
        tags: selectedTags,
        blocked_reason: blockedReason.trim() ? blockedReason : null,
        assigned_to: assigned,
      });
    } finally {
      setSaving(false);
    }
  }, [assigned, blockedReason, description, dueDate, onCreate, priority, saving, selectedTags, status, title]);

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
            <TagPicker availableTags={availableTags} value={tags} onChange={setTags} />
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
