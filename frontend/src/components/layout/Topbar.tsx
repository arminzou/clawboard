import type { RefObject, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, CheckSquare, Clock, Flag, Plus, Zap } from 'lucide-react';
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
  const hasSort = !!(showSort && sortKey && sortDir && onSortKey && onSortDir);
  const hasSelection = !!(showSelectionToggle && onToggleSelection);

  const sortIconMap: Record<string, ReactNode> = {
    updated: <Clock size={16} />,
    created: <Calendar size={16} />,
    due: <Flag size={16} />,
    priority: <Zap size={16} />,
  };

  const sortItems = hasSort
    ? sortOptions.map((opt) => ({
        key: `sort-${opt.key}`,
        label: opt.label,
        checked: sortKey === opt.key,
        icon: sortIconMap[opt.key],
        onSelect: () => onSortKey?.(opt.key),
      }))
    : [];

  const directionItems = hasSort
    ? [
        {
          key: 'dir-asc',
          label: 'Ascending',
          checked: sortDir === 'asc',
          icon: <ArrowUp size={16} />,
          onSelect: () => onSortDir?.('asc'),
        },
        {
          key: 'dir-desc',
          label: 'Descending',
          checked: sortDir === 'desc',
          icon: <ArrowDown size={16} />,
          onSelect: () => onSortDir?.('desc'),
        },
      ]
    : [];

  const overflowItems = [
    { key: 'add', label: 'Add task', onSelect: onCreate, icon: <Plus size={16} /> },
    ...(hasSelection
      ? [
          {
            key: 'toggle-selection',
            label: selectionActive ? 'Exit selection mode' : 'Select tasks',
            onSelect: onToggleSelection!,
            icon: <CheckSquare size={16} />,
          },
        ]
      : []),
    ...(hasSort ? [{ key: 'actions-sep', kind: 'separator' as const }] : []),
    ...(hasSort ? [{ key: 'sort-label', label: 'Sort by', kind: 'label' as const }] : []),
    ...sortItems,
    ...(hasSort ? [{ key: 'sort-sep', kind: 'separator' as const }] : []),
    ...(hasSort ? [{ key: 'dir-label', label: 'Direction', kind: 'label' as const }] : []),
    ...directionItems,
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
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

          {overflowItems.length ? (
            <Menu
              align="right"
              className="sm:hidden"
              items={overflowItems}
              trigger={({ toggle }) => (
                <Button variant="secondary" onClick={toggle}>
                  ⋯
                </Button>
              )}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="hidden sm:flex flex-wrap items-center gap-2">
            {hasSort ? (
              <Menu
                align="left"
                items={[
                  { key: 'sort-label', label: 'Sort by', kind: 'label' as const },
                  ...sortItems,
                  { key: 'sort-sep', kind: 'separator' as const },
                  { key: 'dir-label', label: 'Direction', kind: 'label' as const },
                  ...directionItems,
                ]}
                trigger={({ toggle }) => (
                  <Button variant="secondary" onClick={toggle} left={<ArrowUpDown size={16} />}>
                    Sort: {sortOptions.find((opt) => opt.key === sortKey)?.label ?? 'Updated'} {sortDir === 'asc' ? '↑' : '↓'}
                  </Button>
                )}
              />
            ) : null}

            {hasSelection ? (
              <Button
                variant={selectionActive ? 'primary' : 'secondary'}
                onClick={onToggleSelection}
                title={selectionActive ? 'Exit selection mode' : 'Select multiple tasks'}
                left={<CheckSquare size={16} />}
              >
                {selectionActive ? 'Selecting' : 'Select'}
              </Button>
            ) : null}

            <Button variant="secondary" onClick={onCreate} left={<Plus size={16} />}>
              Add
            </Button>
          </div>

          <div className="flex w-full items-center gap-2 rounded-xl border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] px-3 py-1 shadow-sm transition hover:border-slate-300 hover:bg-white focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-md focus-within:hover:border-indigo-300 focus-within:hover:bg-white sm:ml-auto sm:w-72">
            <Input
              ref={searchRef}
              className="w-full border-0 bg-transparent p-0 shadow-none focus-visible:border-slate-300 focus-visible:ring-0 focus-visible:outline-none"
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
        </div>
      </div>
    </header>
  );
}
