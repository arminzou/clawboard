import clsx from 'clsx';
import { Copy, Folder, Trash2, UserCheck, X, Workflow } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Project, TaskStatus } from '../../lib/api';
import { useAgents } from '../../hooks/useAgents';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

type BulkActionBarProps = {
  count: number;
  projects?: Project[];
  onClearSelection: () => void;
  onBulkAssign: (assigneeId: string | null) => Promise<void>;
  onBulkStatus: (status: TaskStatus) => Promise<void>;
  onBulkProject?: (projectId: number | null) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onBulkDuplicate?: () => Promise<void>;
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export function BulkActionBar({
  count,
  projects = [],
  onClearSelection,
  onBulkAssign,
  onBulkStatus,
  onBulkProject,
  onBulkDelete,
  onBulkDuplicate,
}: BulkActionBarProps) {
  const { agents } = useAgents();
  const [busy, setBusy] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleAssign(value: string) {
    setShowAssignMenu(false);
    setBusy(true);
    try {
      await onBulkAssign(value === '' ? null : value);
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

  async function handleProject(value: string) {
    if (!onBulkProject) return;
    setShowProjectMenu(false);
    setBusy(true);
    try {
      await onBulkProject(value === '' ? null : Number(value));
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
            setShowProjectMenu(false);
          }}
        >
          <UserCheck size={16} />
          Assign
        </button>
        {showAssignMenu ? (
          <div className="absolute bottom-full left-0 mb-2 min-w-40 cb-menu">
            {[{ value: '', label: 'Unassigned' }, ...agents.map((a) => ({ value: a.id, label: a.name }))].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="block w-full text-left cb-menu-item"
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
            setShowProjectMenu(false);
          }}
        >
          <Workflow size={16} />
          Status
        </button>
        {showStatusMenu ? (
          <div className="absolute bottom-full left-0 mb-2 min-w-40 cb-menu">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="block w-full text-left cb-menu-item"
                onClick={() => handleStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {onBulkProject ? (
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-3 py-1.5 text-sm font-medium text-[rgb(var(--cb-text))] transition hover:bg-[rgb(var(--cb-accent-soft))]"
            onClick={() => {
              setShowProjectMenu((v) => !v);
              setShowAssignMenu(false);
              setShowStatusMenu(false);
            }}
          >
            <Folder size={16} />
            Project
          </button>
          {showProjectMenu ? (
            <div className="absolute bottom-full left-0 mb-2 min-w-48 cb-menu">
              <button
                type="button"
                className="block w-full text-left cb-menu-item"
                onClick={() => handleProject('')}
              >
                (unassigned)
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="block w-full text-left cb-menu-item"
                  onClick={() => handleProject(String(p.id))}
                >
                  {p.name}
                </button>
              ))}
              {projects.length === 0 ? (
                <div className="cb-menu-section-label">No projects found.</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

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
