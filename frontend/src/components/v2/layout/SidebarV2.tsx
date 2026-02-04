import type { TaskStatus } from '../../../lib/api';
import { Chip } from '../ui/Chip';

type AssigneeFilter = 'all' | 'tee' | 'fay' | 'armin' | '';

type DueFilter = 'any' | 'overdue' | 'soon' | 'has' | 'none';

type SavedView = {
  id: string;
  name: string;
};

export function SidebarV2({
  projectName,
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
  onDeleteSavedView,
  assignee,
  onAssignee,
  hideDone,
  onHideDone,
  due,
  onDue,
  showArchived,
  onShowArchived,
  onArchiveDone,
  onReset,
}: {
  projectName: string;

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
  onDeleteSavedView: (id: string) => void;

  assignee: AssigneeFilter;
  onAssignee: (v: AssigneeFilter) => void;

  hideDone: boolean;
  onHideDone: (v: boolean) => void;

  due: DueFilter;
  onDue: (v: DueFilter) => void;

  showArchived: boolean;
  onShowArchived: (v: boolean) => void;

  onArchiveDone: () => void | Promise<void>;

  onReset: () => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</div>
            <div className="mt-1 text-base font-semibold text-slate-900">{projectName}</div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            title="New board (coming soon)"
            disabled
          >
            +
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50"
            onClick={onToggleViewsOpen}
          >
            <span>Views</span>
            <span className="text-slate-400">
              <IconChevron open={viewsOpen} />
            </span>
          </button>

          {viewsOpen ? (
            <div className="mt-1 flex flex-col gap-1">
              {savedViews.length ? (
                <>
                  <div className="mt-1 flex items-center justify-between px-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Saved</div>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={onSaveCurrentView}
                      title="Save current filters"
                    >
                      Save
                    </button>
                  </div>
                  {savedViews.map((sv) => (
                    <SavedViewButton
                      key={sv.id}
                      active={activeSavedViewId === sv.id}
                      label={sv.name}
                      onClick={() => onApplySavedView(sv.id)}
                      onDelete={() => onDeleteSavedView(sv.id)}
                    />
                  ))}
                  <div className="mt-2 border-t border-slate-100" />
                </>
              ) : (
                <button
                  type="button"
                  className="mb-1 mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  onClick={onSaveCurrentView}
                >
                  Save current view
                </button>
              )}

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
          ) : null}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50"
            onClick={onToggleFiltersOpen}
          >
            <span>Filters</span>
            <span className="text-slate-400">
              <IconChevron open={filtersOpen} />
            </span>
          </button>

          {filtersOpen ? (
            <>
              <label className="mt-2 text-sm">
                <div className="mb-1 text-xs font-medium text-slate-600">Assignee</div>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  value={assignee}
                  onChange={(e) => onAssignee(e.target.value as AssigneeFilter)}
                >
                  <option value="all">All</option>
                  <option value="tee">tee</option>
                  <option value="fay">fay</option>
                  <option value="armin">armin</option>
                  <option value="">(unassigned)</option>
                </select>
              </label>

              <label className="mt-2 text-sm">
                <div className="mb-1 text-xs font-medium text-slate-600">Due</div>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  value={due}
                  onChange={(e) => onDue(e.target.value as DueFilter)}
                >
                  <option value="any">Any</option>
                  <option value="overdue">Overdue</option>
                  <option value="soon">Due soon (7d)</option>
                  <option value="has">Has due date</option>
                  <option value="none">No due date</option>
                </select>
              </label>

              <label className="mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                <span>Hide done</span>
                <input type="checkbox" checked={hideDone} onChange={(e) => onHideDone(e.target.checked)} />
              </label>

              <label className="mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                <span>Show archived</span>
                <input type="checkbox" checked={showArchived} onChange={(e) => onShowArchived(e.target.checked)} />
              </label>

              <button
                type="button"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                onClick={() => void onArchiveDone()}
              >
                Archive done
              </button>

              <button
                type="button"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                onClick={onReset}
              >
                Reset
              </button>
            </>
          ) : (
            <button
              type="button"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={onReset}
            >
              Reset
            </button>
          )}
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
          ? 'flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white'
          : 'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50'
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
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={
        active
          ? 'flex w-full items-center justify-between gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white'
          : 'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50'
      }
    >
      <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={onClick} title={label}>
        {label}
      </button>
      <button
        type="button"
        className={
          active
            ? 'rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/15'
            : 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50'
        }
        onClick={onDelete}
        title="Delete saved view"
      >
        ×
      </button>
    </div>
  );
}
