import clsx from 'clsx';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Task, TaskStatus } from '../../lib/api';

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const STATUS_ORDER: Record<TaskStatus, number> = {
  backlog: 0,
  in_progress: 1,
  review: 2,
  done: 3,
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  '': 4,
};

type SortKey = 'id' | 'title' | 'status' | 'assignee' | 'due' | 'priority' | 'tags' | 'updated';
type SortDir = 'asc' | 'desc';

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const d = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return String(raw);
  return d.toISOString().slice(0, 10);
}

function parseDate(raw: string | null | undefined): number {
  if (!raw) return 0;
  const d = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <ChevronsUpDown size={14} className="text-slate-400" />;
  }
  return dir === 'asc' ? (
    <ChevronUp size={14} className="text-[rgb(var(--cb-accent))]" />
  ) : (
    <ChevronDown size={14} className="text-[rgb(var(--cb-accent))]" />
  );
}

export function TaskTableV2({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      // Toggle direction or clear
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedTasks = useMemo(() => {
    if (!sortKey) return tasks;

    return [...tasks].sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case 'id':
          cmp = a.id - b.id;
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status':
          cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
          break;
        case 'assignee':
          cmp = (a.assigned_to ?? '').localeCompare(b.assigned_to ?? '');
          break;
        case 'due':
          cmp = parseDate(a.due_date) - parseDate(b.due_date);
          break;
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority ?? ''] ?? 99) - (PRIORITY_ORDER[b.priority ?? ''] ?? 99);
          break;
        case 'tags':
          cmp = (a.tags?.join(',') ?? '').localeCompare(b.tags?.join(',') ?? '');
          break;
        case 'updated':
          cmp = parseDate(a.updated_at) - parseDate(b.updated_at);
          break;
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tasks, sortKey, sortDir]);
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgb(var(--cb-border))] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[rgb(var(--cb-surface-2))] text-left text-xs font-semibold text-slate-700">
            <tr>
              <th className="w-[80px] px-4 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-[rgb(var(--cb-accent))]"
                  onClick={() => handleSort('id')}
                >
                  ID <SortIcon active={sortKey === 'id'} dir={sortDir} />
                </button>
              </th>
              <th className="min-w-[320px] px-4 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-[rgb(var(--cb-accent))]"
                  onClick={() => handleSort('title')}
                >
                  Title <SortIcon active={sortKey === 'title'} dir={sortDir} />
                </button>
              </th>
              <th className="w-[140px] px-4 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-[rgb(var(--cb-accent))]"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon active={sortKey === 'status'} dir={sortDir} />
                </button>
              </th>
              <th className="w-[140px] px-4 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-[rgb(var(--cb-accent))]"
                  onClick={() => handleSort('assignee')}
                >
                  Assignee <SortIcon active={sortKey === 'assignee'} dir={sortDir} />
                </button>
              </th>
              <th className="w-[130px] px-4 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-[rgb(var(--cb-accent))]"
                  onClick={() => handleSort('due')}
                >
                  Due <SortIcon active={sortKey === 'due'} dir={sortDir} />
                </button>
              </th>
              <th className="w-[120px] px-4 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-[rgb(var(--cb-accent))]"
                  onClick={() => handleSort('priority')}
                >
                  Priority <SortIcon active={sortKey === 'priority'} dir={sortDir} />
                </button>
              </th>
              <th className="min-w-[220px] px-4 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-[rgb(var(--cb-accent))]"
                  onClick={() => handleSort('tags')}
                >
                  Tags <SortIcon active={sortKey === 'tags'} dir={sortDir} />
                </button>
              </th>
              <th className="w-[140px] px-4 py-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-[rgb(var(--cb-accent))]"
                  onClick={() => handleSort('updated')}
                >
                  Updated <SortIcon active={sortKey === 'updated'} dir={sortDir} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTasks.map((t) => {
              const due = fmtDate(t.due_date ?? null);
              const updated = fmtDate((t.updated_at as string | undefined) ?? (t.created_at as string | undefined));
              const priority = String(t.priority ?? '').trim();

              return (
                <tr
                  key={t.id}
                  className={clsx(
                    'cursor-pointer bg-white hover:bg-slate-50',
                    t.blocked_reason ? 'bg-rose-50/30' : null,
                  )}
                  onClick={() => onOpen(t)}
                  title={t.blocked_reason ? `Blocked: ${t.blocked_reason}` : 'Open'}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{t.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{t.title}</div>
                    {t.blocked_reason ? (
                      <div className="mt-1 line-clamp-1 text-xs text-rose-700">Blocked: {t.blocked_reason}</div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{STATUS_LABEL[t.status as TaskStatus] ?? t.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{t.assigned_to ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{due || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{priority || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {Array.isArray(t.tags) && t.tags.length ? (
                      <div className="flex flex-wrap gap-1">
                        {t.tags.slice(0, 6).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
                          >
                            {tag}
                          </span>
                        ))}
                        {t.tags.length > 6 ? <span className="text-xs text-slate-500">+{t.tags.length - 6}</span> : null}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{updated || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 text-xs text-slate-500">
        <div>{tasks.length} task{tasks.length === 1 ? '' : 's'}</div>
        <div className="hidden sm:block">Tip: click a row to edit • filters still apply</div>
      </div>
    </div>
  );
}
