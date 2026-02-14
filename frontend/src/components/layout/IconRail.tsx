import type { ReactNode } from 'react';
import { IconButton } from '../ui/Button';

export type AppTab = 'kanban' | 'activity' | 'docs';

export function IconRail({
  tab,
  onTab,
}: {
  tab: AppTab;
  onTab: (t: AppTab) => void;
}) {
  const items: Array<{ key: AppTab; label: string; icon: ReactNode }> = [
    { key: 'kanban', label: 'Projects', icon: <IconProjects /> },
    { key: 'activity', label: 'Activity', icon: <IconActivity /> },
    { key: 'docs', label: 'Docs', icon: <IconDocs /> },
  ];

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-3 bg-[rgb(var(--cb-accent))] py-3">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--cb-surface)/0.12)] text-[rgb(var(--cb-surface))] transition hover:bg-[rgb(var(--cb-surface)/0.18)]"
        title="Clawboard"
        aria-label="Clawboard"
        onClick={() => onTab('kanban')}
      >
        C
      </button>

      <div className="flex flex-1 flex-col items-center gap-2">
        {items.map((it) => (
          <IconButton key={it.key} label={it.label} active={tab === it.key} onClick={() => onTab(it.key)}>
            {it.icon}
          </IconButton>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <IconButton label="Settings" disabled>
          <IconSettings />
        </IconButton>
      </div>
    </aside>
  );
}

function IconProjects() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M8 5V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 5V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12h4l2-4 4 8 2-4h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDocs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4h7l3 3v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M14 4v4h4" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2.1-1.6-2-3.4-2.5 1a8.1 8.1 0 0 0-1.7-1l-.4-2.7h-4l-.4 2.7a8.1 8.1 0 0 0-1.7 1l-2.5-1-2 3.4L4.6 13a7.9 7.9 0 0 0-.1 1 7.9 7.9 0 0 0 .1 1l-2.1 1.6 2 3.4 2.5-1a8.1 8.1 0 0 0 1.7 1l.4 2.7h4l.4-2.7a8.1 8.1 0 0 0 1.7-1l2.5 1 2-3.4L19.4 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
