import clsx from 'clsx';
import type { Task, TaskStatus } from '../../lib/api';

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const d = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return String(raw);
  return d.toISOString().slice(0, 10);
}

export function TaskTableV2({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgb(var(--cb-border))] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[rgb(var(--cb-surface-2))] text-left text-xs font-semibold text-slate-700">
            <tr>
              <th className="w-[80px] px-4 py-3">ID</th>
              <th className="min-w-[320px] px-4 py-3">Title</th>
              <th className="w-[140px] px-4 py-3">Status</th>
              <th className="w-[140px] px-4 py-3">Assignee</th>
              <th className="w-[130px] px-4 py-3">Due</th>
              <th className="w-[120px] px-4 py-3">Priority</th>
              <th className="min-w-[220px] px-4 py-3">Tags</th>
              <th className="w-[140px] px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((t) => {
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
