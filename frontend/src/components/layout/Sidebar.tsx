import { ChevronLeft, ChevronRight, ChevronDown, Folder, User, Trash2, Pencil, Save, Sliders } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TaskStatus, Project } from '../../lib/api';
import { Chip } from '../ui/Chip';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ModalShell } from '../ui/ModalShell';
import { PromptModal } from '../ui/PromptModal';

type AssigneeFilter = 'all' | 'tee' | 'fay' | 'armin' | '';

type DueFilter = 'any' | 'overdue' | 'soon' | 'has' | 'none';

type TagFilter = 'all' | (string & {});

type ContextFilter = 'all' | 'current' | (string & {});

type SavedView = {
  id: string;
  name: string;
};

export function Sidebar({
  projectName,
  projects,
  currentProjectId,
  onProjectChange,
  onDeleteProject,
  collapsed,
  onToggleCollapsed,
  viewsOpen,
  onToggleViewsOpen,
  filtersOpen,
  onToggleFiltersOpen,
  view,
  onView,
  viewItems,
  savedViews,
  activeSavedViewId,
  onApplySavedView,
  onSaveCurrentView,
  onSaveViewName,
  onDeleteSavedView,
  onRenameSavedView,
  onUpdateSavedViewFilters,
  assignee,
  onAssignee,
  hideDone,
  onHideDone,
  blocked,
  onBlocked,
  due,
  onDue,
  tag,
  tagOptions,
  onTag,
  showArchived,
  onShowArchived,
  onArchiveDone,
  onAssignUnassignedTasks,
  context,
  onContext,
  currentContextKey,
  onReset,
  onMyTasks,
  myTasksCount,
}: {
  projectName: string;
  projects?: Project[];
  currentProjectId?: number | null;
  onProjectChange?: (id: number | null) => void;
  onDeleteProject?: (id: number) => void | Promise<void>;

  collapsed: boolean;
  onToggleCollapsed: () => void;

  viewsOpen: boolean;
  onToggleViewsOpen: () => void;

  filtersOpen: boolean;
  onToggleFiltersOpen: () => void;

  view: 'all' | TaskStatus;
  onView: (v: 'all' | TaskStatus) => void;
  viewItems: Array<{ key: 'all' | TaskStatus; label: string; count: number }>;

  savedViews: SavedView[];
  activeSavedViewId: string | null;
  onApplySavedView: (id: string) => void;
  onSaveCurrentView: () => void;
  onSaveViewName: (v: string) => void;
  onDeleteSavedView: (id: string) => void;
  onRenameSavedView?: (id: string) => void;
  onUpdateSavedViewFilters?: (id: string) => void;

  assignee: AssigneeFilter;
  onAssignee: (v: AssigneeFilter) => void;

  hideDone: boolean;
  onHideDone: (v: boolean) => void;

  blocked: boolean;
  onBlocked: (v: boolean) => void;

  due: DueFilter;
  onDue: (v: DueFilter) => void;

  tag: TagFilter;
  tagOptions: string[];
  onTag: (v: TagFilter) => void;

  showArchived: boolean;
  onShowArchived: (v: boolean) => void;

  onArchiveDone: () => void | Promise<void>;
  onAssignUnassignedTasks?: (projectId: number) => void | Promise<void>;

  context: ContextFilter;
  onContext: (v: ContextFilter) => void;
  currentContextKey: string | null;

  onReset: () => void;

  onMyTasks?: () => void;
  myTasksCount?: number;
}) {
  // Count active filters (non-default values)
  const activeFilterCount = [
    assignee !== 'all',
    context !== 'all',
    hideDone,
    blocked,
    due !== 'any',
    tag !== 'all',
  ].filter(Boolean).length;

  const activeSavedView = activeSavedViewId ? savedViews.find((x) => x.id === activeSavedViewId) : null;
  const currentViewLabel = activeSavedView?.name ?? viewItems.find((it) => it.key === view)?.label ?? 'All';

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [confirmDeleteView, setConfirmDeleteView] = useState<{ id: string; name: string } | null>(null);
  const [assignProjectModalOpen, setAssignProjectModalOpen] = useState(false);
  const [assignProjectId, setAssignProjectId] = useState<number | null>(null);
  const savedViewsRef = useRef<HTMLDivElement | null>(null);
  const currentViewRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!viewsOpen) return;

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (savedViewsRef.current?.contains(target)) return;
      if (currentViewRef.current?.contains(target)) return;
      onToggleViewsOpen();
    }

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [viewsOpen, onToggleViewsOpen]);

  const filterChipClass =
    'inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 active:bg-slate-100 active:translate-y-px active:shadow-inner';

  // Collapsed state - show only toggle button
  if (collapsed) {
    return (
      <aside className="hidden h-full w-10 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col lg:items-center lg:py-3">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 active:translate-y-px active:shadow-inner"
          onClick={onToggleCollapsed}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="h-full w-full border-slate-200 bg-white lg:w-72 lg:border-r">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</div>
            {projects && projects.length >= 1 && onProjectChange ? (
              <div className="relative mt-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-50 active:bg-slate-100 active:translate-y-px active:shadow-inner"
                  onClick={() => setProjectMenuOpen((v) => !v)}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder size={16} className="shrink-0 text-slate-400" />
                    <span className="truncate">{projectName}</span>
                  </span>
                  <ChevronDown size={14} className={`shrink-0 text-slate-400 transition ${projectMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {projectMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProjectMenuOpen(false)} />
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto cb-menu">
                      <button
                        type="button"
                        className={`flex w-full items-center gap-2 text-left transition cb-menu-item ${
                          currentProjectId === null
                            ? 'bg-indigo-50 font-semibold text-indigo-700'
                            : 'text-slate-700'
                        }`}
                        onClick={() => {
                          onProjectChange(null);
                          setProjectMenuOpen(false);
                        }}
                      >
                        <Folder size={16} className="shrink-0 text-slate-400" />
                        <span>All Projects</span>
                      </button>
                      <div className="cb-menu-separator" />
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          className={`flex w-full items-center gap-2 text-sm transition cb-menu-item ${
                            currentProjectId === p.id
                              ? 'bg-indigo-50 font-semibold text-indigo-700'
                              : 'text-slate-700'
                          }`}
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left"
                            onClick={() => {
                              onProjectChange(p.id);
                              setProjectMenuOpen(false);
                            }}
                          >
                            <span
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                              style={{ backgroundColor: p.color || '#6366f1' }}
                            >
                              <Folder size={10} className="text-white" />
                            </span>
                            <span className="truncate">{p.name}</span>
                          </button>
                          {onDeleteProject && (
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-600 active:bg-red-100 active:translate-y-px active:shadow-inner"
                              onClick={(e) => {
                                e.stopPropagation();
                                const ok = window.confirm(`Delete project "${p.name}"? This will unlink all associated tasks.`);
                                if (ok) {
                                  onDeleteProject(p.id);
                                  setProjectMenuOpen(false);
                                }
                              }}
                              title={`Delete project "${p.name}"`}
                              aria-label={`Delete project "${p.name}"`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {onAssignUnassignedTasks && projects?.length ? (
                        <>
                          <div className="cb-menu-separator" />
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 text-left text-xs font-semibold text-slate-700 cb-menu-item"
                            onClick={() => {
                              const projectList = projects ?? [];
                              const fallbackProjectId =
                                currentProjectId ?? (projectList.length === 1 ? projectList[0].id : null);
                              setAssignProjectId(fallbackProjectId);
                              setAssignProjectModalOpen(true);
                              setProjectMenuOpen(false);
                            }}
                          >
                            Assign unassigned tasks
                          </button>
                        </>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-1 truncate text-base font-semibold text-slate-900">{projectName}</div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 active:translate-y-px active:shadow-inner"
              onClick={onToggleCollapsed}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {onMyTasks && (
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 active:bg-indigo-200 active:translate-y-px active:shadow-inner"
            onClick={onMyTasks}
          >
            <span className="flex items-center gap-2">
              <User size={16} />
              <span>My Tasks</span>
            </span>
            {myTasksCount !== undefined && (
              <Chip variant="strong" className="bg-indigo-200 text-indigo-800">
                {myTasksCount}
              </Chip>
            )}
          </button>
        )}

        {showSaveViewModal && (
          <PromptModal
            title="Save view"
            message="Name this view so you can reuse it later."
            placeholder="View name"
            confirmLabel="Save"
            onClose={() => setShowSaveViewModal(false)}
            onConfirm={(value) => {
              onSaveViewName(value);
              queueMicrotask(() => onSaveCurrentView());
              setShowSaveViewModal(false);
            }}
          />
        )}

        {confirmDeleteView && (
          <ConfirmModal
            title="Delete saved view?"
            message={`This will remove "${confirmDeleteView.name}". You can save it again later.`}
            confirmLabel="Delete"
            onClose={() => setConfirmDeleteView(null)}
            onConfirm={() => {
              onDeleteSavedView(confirmDeleteView.id);
              setConfirmDeleteView(null);
            }}
          />
        )}

        {assignProjectModalOpen && onAssignUnassignedTasks ? (
          <ModalShell onClose={() => setAssignProjectModalOpen(false)}>
            <div className="flex flex-col gap-4 text-left">
              <div>
                <div className="text-lg font-semibold text-[rgb(var(--cb-text))]">Assign unassigned tasks</div>
                <div className="mt-1 text-sm text-[rgb(var(--cb-text-muted))]">
                  Choose which project should receive tasks without a project.
                </div>
              </div>

              <label className="text-sm">
                <div className="mb-1 text-xs font-medium text-[rgb(var(--cb-text-muted))]">Target project</div>
                <Select
                  value={assignProjectId ?? ''}
                  onChange={(e) => setAssignProjectId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">(select a project)</option>
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </label>

              <div className="mt-2 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setAssignProjectModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={!assignProjectId}
                  onClick={() => {
                    if (!assignProjectId) return;
                    onAssignUnassignedTasks(assignProjectId);
                    setAssignProjectModalOpen(false);
                  }}
                >
                  Assign
                </Button>
              </div>
            </div>
          </ModalShell>
        ) : null}

        <div className="mt-4">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Views</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
                onClick={() => setShowSaveViewModal(true)}
              >
                <Save size={12} className="shrink-0" />
                <span className="leading-none">Save as</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <button
              ref={currentViewRef}
              type="button"
              className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 active:bg-slate-100 active:translate-y-px active:shadow-inner"
              onClick={onToggleViewsOpen}
            >
              <span className="truncate">{currentViewLabel}</span>
              <ChevronDown size={14} className={`shrink-0 text-slate-400 transition ${viewsOpen ? 'rotate-180' : ''}`} />
            </button>

            {viewsOpen && savedViews.length ? (
              <div
                ref={savedViewsRef}
                className="absolute left-0 right-0 z-30 mt-1 cb-menu"
              >
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Saved views</div>
                <div className="flex flex-col gap-1">
                  {savedViews.map((sv) => (
                    <SavedViewButton
                      key={sv.id}
                      active={activeSavedViewId === sv.id}
                      label={sv.name}
                      onClick={() => {
                        onApplySavedView(sv.id);
                        onToggleViewsOpen();
                      }}
                      onDelete={() => setConfirmDeleteView({ id: sv.id, name: sv.name })}
                      onRename={onRenameSavedView ? () => onRenameSavedView(sv.id) : undefined}
                      onUpdateFilters={onUpdateSavedViewFilters ? () => onUpdateSavedViewFilters(sv.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex flex-col gap-1">
            {viewItems.map((it) => (
              <ViewButton
                key={String(it.key)}
                active={view === it.key}
                label={it.label}
                count={it.count}
                onClick={() => onView(it.key)}
              />
            ))}
          </div>

        </div>
        <div className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-slate-50 active:bg-slate-100 active:translate-y-px active:shadow-inner"
              onClick={onToggleFiltersOpen}
            >
              <span className="flex items-center gap-2">
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <span className="text-slate-400">
                <IconChevron open={filtersOpen} />
              </span>
            </button>

            {filtersOpen ? (
              <div className="mt-1 rounded-xl bg-white/60 p-2">
                <div className="flex flex-col gap-2 px-1">
                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-1 rounded-lg border border-indigo-100 bg-indigo-50 p-2">
                  {assignee !== 'all' && (
                    <button
                      type="button"
                      className={filterChipClass}
                      onClick={() => onAssignee('all')}
                      title="Clear assignee filter"
                    >
                      {assignee === '' ? 'Unassigned' : assignee}
                    </button>
                  )}
                  {hideDone && (
                    <button
                      type="button"
                      className={filterChipClass}
                      onClick={() => onHideDone(false)}
                      title="Clear hide done"
                    >
                      Hide done
                    </button>
                  )}
                  {blocked && (
                    <button
                      type="button"
                      className={filterChipClass}
                      onClick={() => onBlocked(false)}
                      title="Clear blocked filter"
                    >
                      Blocked only
                    </button>
                  )}
                  {due !== 'any' && (
                    <button
                      type="button"
                      className={filterChipClass}
                      onClick={() => onDue('any')}
                      title="Clear due filter"
                    >
                      Due: {due}
                    </button>
                  )}
                  {tag !== 'all' && (
                    <button
                      type="button"
                      className={filterChipClass}
                      onClick={() => onTag('all')}
                      title="Clear tag filter"
                    >
                      #{tag}
                    </button>
                  )}
                  {context !== 'all' && (
                    <button
                      type="button"
                      className={filterChipClass}
                      onClick={() => onContext('all')}
                      title="Clear context filter"
                    >
                      Context: {context === 'current' ? currentContextKey || 'current' : context}
                    </button>
                  )}
                </div>
              )}
              <label className="text-sm">
                <div className="mb-1 text-xs font-medium text-slate-600">Assignee</div>
                <Select
                  value={assignee}
                  onChange={(e) => onAssignee(e.target.value as AssigneeFilter)}
                >
                  <option value="all">All</option>
                  <option value="tee">tee</option>
                  <option value="fay">fay</option>
                  <option value="armin">armin</option>
                  <option value="">(unassigned)</option>
                </Select>
              </label>

              <label className="text-sm">
                <div className="mb-1 text-xs font-medium text-slate-600">Due</div>
                <Select
                  value={due}
                  onChange={(e) => onDue(e.target.value as DueFilter)}
                >
                  <option value="any">Any</option>
                  <option value="overdue">Overdue</option>
                  <option value="soon">Due soon (7d)</option>
                  <option value="has">Has due date</option>
                  <option value="none">No due date</option>
                </Select>
              </label>

              <label className="text-sm">
                <div className="mb-1 text-xs font-medium text-slate-600">Tag</div>
                <Select
                  value={tag}
                  onChange={(e) => onTag((e.target.value || 'all') as TagFilter)}
                >
                  <option value="all">All</option>
                  {tagOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </label>

              {currentContextKey && (
                <label className="text-sm">
                  <div className="mb-1 text-xs font-medium text-slate-600">Context (branch/worktree)</div>
                  <Select
                    value={context}
                    onChange={(e) => onContext((e.target.value || 'all') as ContextFilter)}
                  >
                    <option value="all">All contexts</option>
                    <option value="current">Current: {currentContextKey}</option>
                  </Select>
                </label>
              )}

              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800">
                <span>Hide done</span>
                <input type="checkbox" checked={hideDone} onChange={(e) => onHideDone(e.target.checked)} />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800">
                <span>Blocked only</span>
                <input type="checkbox" checked={blocked} onChange={(e) => onBlocked(e.target.checked)} />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800">
                <span>Show archived</span>
                <input type="checkbox" checked={showArchived} onChange={(e) => onShowArchived(e.target.checked)} />
              </label>

              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 active:bg-slate-200 active:translate-y-px active:shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                onClick={() => void onArchiveDone()}
              >
                Archive done
              </button>

              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 active:bg-slate-200 active:translate-y-px active:shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                onClick={onReset}
              >
                Reset
              </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 active:bg-slate-200 active:translate-y-px active:shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
              onClick={onReset}
            >
              Reset
            </button>
          )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={open ? 'rotate-90 transition' : 'transition'}
    >
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ViewButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? 'flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition active:bg-slate-800 active:translate-y-px active:shadow-inner'
          : 'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 active:bg-slate-100 active:translate-y-px active:shadow-inner'
      }
      onClick={onClick}
    >
      <span>{label}</span>
      <Chip variant={active ? 'strong' : 'soft'} className={active ? 'bg-white/15 text-white' : undefined}>
        {count}
      </Chip>
    </button>
  );
}

function SavedViewButton({
  active,
  label,
  onClick,
  onDelete,
  onRename,
  onUpdateFilters,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  onDelete: () => void;
  onRename?: () => void;
  onUpdateFilters?: () => void;
}) {
  return (
    <div
      className={
        active
          ? 'flex w-full items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-900 shadow-sm'
          : 'flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm'
      }
    >
      <button
        type="button"
        className="min-w-0 flex-1 truncate px-1 py-1 text-left"
        onClick={onClick}
        title={label}
      >
        {label}
      </button>
      <div className="flex items-center gap-1">
        {onUpdateFilters && (
          <button
            type="button"
            className={
              active
                ? 'rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 active:bg-indigo-200 active:translate-y-px active:shadow-inner'
                : 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 active:translate-y-px active:shadow-inner'
            }
            onClick={onUpdateFilters}
            title="Update filters"
            aria-label={`Update filters for ${label}`}
          >
            <Sliders size={12} />
          </button>
        )}
        {onRename && (
          <button
            type="button"
            className={
              active
                ? 'rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 active:bg-indigo-200 active:translate-y-px active:shadow-inner'
                : 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 active:translate-y-px active:shadow-inner'
            }
            onClick={onRename}
            title="Rename"
            aria-label={`Rename ${label}`}
          >
            <Pencil size={12} />
          </button>
        )}
        <button
          type="button"
          className={
            active
              ? 'rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 active:bg-indigo-200 active:translate-y-px active:shadow-inner'
              : 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 active:translate-y-px active:shadow-inner'
          }
          onClick={onDelete}
          title="Delete"
          aria-label={`Delete ${label}`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
