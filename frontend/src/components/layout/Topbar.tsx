import { RefreshCw } from 'lucide-react';
import type { RefObject } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Menu } from '../ui/Menu';

export type TopbarMode = 'board' | 'table';

export type TopbarSortOption = {
  key: string;
  label: string;
};

export function Topbar({
  boardName,
  mode,
  onMode,
  q,
  onQ,
  searchRef,
  onCreate,
  onRefresh,
  showSelectionToggle = false,
  selectionActive = false,
  onToggleSelection,
  showSort = false,
  sortKey,
  sortDir,
  sortOptions = [],
  onSortKey,
  onSortDir,
}: {
  boardName: string;
  mode: TopbarMode;
  onMode: (m: TopbarMode) => void;
  q: string;
  onQ: (v: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  onCreate: () => void;
  onRefresh: () => void | Promise<void>;
  showSelectionToggle?: boolean;
  selectionActive?: boolean;
  onToggleSelection?: () => void;
  showSort?: boolean;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  sortOptions?: TopbarSortOption[];
  onSortKey?: (key: string) => void;
  onSortDir?: (dir: 'asc' | 'desc') => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">{boardName}</div>
            <div className="text-xs text-slate-500">Board</div>
          </div>

          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={
                mode === 'board'
                  ? 'rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm'
                  : 'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white'
              }
              title="Board"
              onClick={() => onMode('board')}
            >
              Board
            </button>
            <button
              type="button"
              className={
                mode === 'table'
                  ? 'rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm'
                  : 'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white'
              }
              title="Table"
              onClick={() => onMode('table')}
            >
              Table
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-3 py-2 shadow-sm">
            <Input
              ref={searchRef}
              className="w-64 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              placeholder="Search… (/)"
              value={q}
              onChange={(e) => onQ(e.target.value)}
            />
            {q ? (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                onClick={() => onQ('')}
                title="Clear"
              >
                Clear
              </button>
            ) : null}
          </div>

          {showSort && sortKey && sortDir && onSortKey && onSortDir ? (
            <Menu
              align="left"
              items={[
                ...sortOptions.map((opt) => ({
                  key: opt.key,
                  label: `${sortKey === opt.key ? '✓ ' : ''}${opt.label}`,
                  onSelect: () => onSortKey(opt.key),
                })),
                {
                  key: 'direction',
                  label: `Direction: ${sortDir === 'asc' ? 'Ascending' : 'Descending'}`,
                  onSelect: () => onSortDir(sortDir === 'asc' ? 'desc' : 'asc'),
                },
              ]}
              trigger={({ toggle }) => (
                <Button variant="secondary" onClick={toggle}>
                  Sort: {sortOptions.find((opt) => opt.key === sortKey)?.label ?? 'Updated'} {sortDir === 'asc' ? '↑' : '↓'}
                </Button>
              )}
            />
          ) : null}

          {showSelectionToggle && onToggleSelection ? (
            <Button
              variant={selectionActive ? 'primary' : 'secondary'}
              onClick={onToggleSelection}
              title={selectionActive ? 'Exit selection mode' : 'Select multiple tasks'}
            >
              {selectionActive ? 'Selecting' : 'Select'}
            </Button>
          ) : null}

          <Button variant="secondary" onClick={onCreate}>
            + Add
          </Button>

          <Button variant="secondary" onClick={onRefresh} title="Refresh (⟳)" className="p-2">
            <RefreshCw size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}
