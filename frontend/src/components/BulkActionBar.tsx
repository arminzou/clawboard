import clsx from 'clsx';
import { Copy, Trash2, UserCheck, X, Workflow } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Assignee, TaskStatus } from '../lib/api';
import { ConfirmModal } from './ui/ConfirmModal';

type BulkActionBarProps = {
  count: number;
  onClearSelection: () => void;
  onBulkAssign: (assignee: Assignee | null) => Promise<void>;
  onBulkStatus: (status: TaskStatus) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onBulkDuplicate?: () => Promise<void>;
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const ASSIGNEE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Unassigned' },
  { value: 'tee', label: 'Tee' },
  { value: 'fay', label: 'Fay' },
  { value: 'armin', label: 'Armin' },
];

export function BulkActionBar({
  count,
  onClearSelection,
  onBulkAssign,
  onBulkStatus,
  onBulkDelete,
  onBulkDuplicate,
}: BulkActionBarProps) {
  const [busy, setBusy] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleAssign(value: string) {
    setShowAssignMenu(false);
    setBusy(true);
    try {
      await onBulkAssign(value === '' ? null : (value as Assignee));
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(value: string) {
    setShowStatusMenu(false);
    setBusy(true);
    try {
      await onBulkStatus(value as TaskStatus);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await onBulkDelete();
    } finally {
      setBusy(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleDuplicate() {
    if (!onBulkDuplicate) return;
    setBusy(true);
    try {
      await onBulkDuplicate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={clsx(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2',
        'flex items-center gap-3 rounded-xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-4 py-2 shadow-lg',
        busy && 'pointer-events-none opacity-70',
      )}
    >
      {/* Count & clear */}
      <div className="flex items-center gap-2 border-r border-[rgb(var(--cb-border))] pr-3">
        <span className="rounded-full bg-[rgb(var(--cb-accent))] px-2.5 py-0.5 text-xs font-semibold text-white">
          {count}
        </span>
        <span className="text-sm text-[rgb(var(--cb-text-muted))]">selected</span>
        <button
          type="button"
          className="ml-1 rounded-lg p-1 text-[rgb(var(--cb-text-muted))] transition hover:bg-[rgb(var(--cb-accent-soft))] hover:text-[rgb(var(--cb-text))]"
          title="Clear selection"
          onClick={onClearSelection}
        >
          <X size={16} />
        </button>
      </div>

      {/* Assign dropdown */}
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-3 py-1.5 text-sm font-medium text-[rgb(var(--cb-text))] transition hover:bg-[rgb(var(--cb-accent-soft))]"
          onClick={() => {
            setShowAssignMenu((v) => !v);
            setShowStatusMenu(false);
          }}
        >
          <UserCheck size={16} />
          Assign
        </button>
        {showAssignMenu ? (
          <div className="absolute bottom-full left-0 mb-2 w-40 rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] py-1 shadow-lg">
            {ASSIGNEE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm text-[rgb(var(--cb-text))] hover:bg-[rgb(var(--cb-accent-soft))]"
                onClick={() => handleAssign(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Status dropdown */}
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-3 py-1.5 text-sm font-medium text-[rgb(var(--cb-text))] transition hover:bg-[rgb(var(--cb-accent-soft))]"
          onClick={() => {
            setShowStatusMenu((v) => !v);
            setShowAssignMenu(false);
          }}
        >
          <Workflow size={16} />
          Status
        </button>
        {showStatusMenu ? (
          <div className="absolute bottom-full left-0 mb-2 w-40 rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] py-1 shadow-lg">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm text-[rgb(var(--cb-text))] hover:bg-[rgb(var(--cb-accent-soft))]"
                onClick={() => handleStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Duplicate button (optional) */}
      {onBulkDuplicate ? (
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-3 py-1.5 text-sm font-medium text-[rgb(var(--cb-text))] transition hover:bg-[rgb(var(--cb-accent-soft))]"
          onClick={handleDuplicate}
        >
          <Copy size={16} />
          Duplicate
        </button>
      ) : null}

      {/* Delete button */}
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
        onClick={() => setShowDeleteConfirm(true)}
      >
        <Trash2 size={16} />
        Delete
      </button>

      {showDeleteConfirm && createPortal(
        <ConfirmModal
          title={`Delete ${count} Task${count === 1 ? '' : 's'}`}
          message={`Are you sure you want to delete ${count} task${count === 1 ? '' : 's'}? This action cannot be undone.`}
          confirmLabel={busy ? 'Deleting...' : `Delete ${count} Task${count === 1 ? '' : 's'}`}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />,
        document.body
      )}
    </div>
  );
}
