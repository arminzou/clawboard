import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KanbanPageV2 } from './components/v2/KanbanPageV2';
import { IconButton } from './components/v2/ui/Button';
import { ActivityTimeline } from './components/ActivityTimeline';
import { DocsView } from './components/DocsView';
import { useWebSocket } from './hooks/useWebSocket';
import { Toast } from './components/Toast';
import './index.css';

type Tab = 'kanban' | 'activity' | 'docs';

export default function App() {
  const [tab, setTab] = useState<Tab>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('pm.tab') : null;
    return (raw === 'kanban' || raw === 'activity' || raw === 'docs' ? raw : 'kanban') as Tab;
  });

  const [toast, setToast] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const pushToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const { lastMessage } = useWebSocket({
    onMessage: (m) => {
      const t = String(m.type || '');
      if (t.startsWith('task_')) pushToast(`Tasks updated (${t})`);
    },
  });

  const wsSignal = useMemo(() => lastMessage, [lastMessage]);

  useEffect(() => {
    try {
      window.localStorage.setItem('pm.tab', tab);
    } catch {
      // ignore
    }
  }, [tab]);

  return (
    <ErrorBoundary>
      <div className="h-full bg-slate-100">
        {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}

        <div className="flex h-full">
          <IconRailV2 tab={tab} onTab={setTab} />

          <div className="min-w-0 flex-1">
            {tab === 'kanban' ? (
              <KanbanPageV2
                wsSignal={wsSignal}
                openTaskId={openTaskId}
                onOpenTaskConsumed={() => setOpenTaskId(null)}
              />
            ) : null}

            {tab === 'activity' ? (
              <div className="h-full p-4">
                <ActivityTimeline
                  wsSignal={wsSignal}
                  onOpenTask={(id) => {
                    setOpenTaskId(id);
                    setTab('kanban');
                  }}
                />
              </div>
            ) : null}

            {tab === 'docs' ? (
              <div className="h-full p-4">
                <DocsView wsSignal={wsSignal} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function IconRailV2({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const items: Array<{ key: Tab; label: string; icon: ReactNode }> = [
    { key: 'kanban', label: 'Projects', icon: <IconProjects /> },
    { key: 'activity', label: 'Activity', icon: <IconActivity /> },
    { key: 'docs', label: 'Docs', icon: <IconDocs /> },
  ];

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-3 bg-slate-950 py-3">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white"
        title="Clawboard"
        aria-label="Clawboard"
        onClick={() => onTab('kanban')}
      >
        C
      </button>

      <div className="flex flex-1 flex-col items-center gap-2">
        {items.map((it) => (
          <IconButton
            key={it.key}
            label={it.label}
            active={tab === it.key}
            onClick={() => onTab(it.key)}
          >
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
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 5V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 5V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h4l2-4 4 8 2-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDocs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h7l3 3v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 4v4h4" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2.1-1.6-2-3.4-2.5 1a8.1 8.1 0 0 0-1.7-1l-.4-2.7h-4l-.4 2.7a8.1 8.1 0 0 0-1.7 1l-2.5-1-2 3.4L4.6 13a7.9 7.9 0 0 0-.1 1 7.9 7.9 0 0 0 .1 1l-2.1 1.6 2 3.4 2.5-1a8.1 8.1 0 0 0 1.7 1l.4 2.7h4l.4-2.7a8.1 8.1 0 0 0 1.7-1l2.5 1 2-3.4L19.4 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  state = { hasError: false as boolean, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Frontend crashed while rendering.</div>
          <div className="mt-2">{this.state.error?.message ?? 'Unknown error'}</div>
          {this.state.error?.stack ? (
            <pre className="mt-2 whitespace-pre-wrap text-xs text-red-800">{this.state.error.stack}</pre>
          ) : null}
        </div>
      </div>
    );
  }
}
