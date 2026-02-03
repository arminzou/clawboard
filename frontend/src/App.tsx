import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { ActivityTimeline } from './components/ActivityTimeline';
import { DocsView } from './components/DocsView';
import { useWebSocket } from './hooks/useWebSocket';
import { useHealth } from './hooks/useHealth';
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

  const { status: wsStatus, lastMessage } = useWebSocket({
    onMessage: (m) => {
      const t = String(m.type || '');
      if (t.startsWith('task_')) pushToast(`Tasks updated (${t})`);
      else if (t.startsWith('activity_')) pushToast(`Activity updated (${t})`);
      else if (t.startsWith('document_')) pushToast(`Docs updated (${t})`);
    },
  });

  const health = useHealth();

  const wsSignal = useMemo(() => lastMessage, [lastMessage]);

  useEffect(() => {
    try {
      window.localStorage.setItem('pm.tab', tab);
    } catch {
      // ignore
    }
  }, [tab]);

  // Toasts are pushed from the WebSocket onMessage handler.

  return (
    <ErrorBoundary>
      <div className="h-full bg-slate-100">
        {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}

        <div className="flex h-full">
          {/* Slim left rail */}
          <aside className="flex w-14 shrink-0 flex-col justify-between border-r border-slate-200 bg-white">
            <div className="flex flex-col gap-1 p-2">
              <div className="mb-1 flex h-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white" title="Clawboard">
                C
              </div>

              <RailButton active={tab === 'kanban'} label="Kanban" onClick={() => setTab('kanban')}>
                <IconKanban />
              </RailButton>
              <RailButton active={tab === 'activity'} label="Activity" onClick={() => setTab('activity')}>
                <IconActivity />
              </RailButton>
              <RailButton active={tab === 'docs'} label="Docs" onClick={() => setTab('docs')}>
                <IconDocs />
              </RailButton>
            </div>

            <div className="p-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">API</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-800">
                  {health.checking ? '…' : health.ok ? 'ok' : 'down'}
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">WS</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-800">{wsStatus}</div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            <div className="border-b border-slate-200 bg-white">
              <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3">
                <div>
                  <div className="text-base font-semibold text-slate-900">Clawboard</div>
                  <div className="text-xs text-slate-500">
                    {tab === 'kanban' ? 'Kanban' : tab === 'activity' ? 'Activity' : 'Docs'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto h-[calc(100%-56px)] max-w-screen-2xl px-4 py-4">
              {tab === 'kanban' ? (
                <KanbanBoard
                  wsSignal={wsSignal}
                  openTaskId={openTaskId}
                  onOpenTaskConsumed={() => setOpenTaskId(null)}
                />
              ) : null}
              {tab === 'activity' ? (
                <ActivityTimeline
                  wsSignal={wsSignal}
                  onOpenTask={(id) => {
                    setOpenTaskId(id);
                    setTab('kanban');
                  }}
                />
              ) : null}
              {tab === 'docs' ? <DocsView wsSignal={wsSignal} /> : null}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white'
          : 'flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-50'
      }
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function IconKanban() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M9 4v16" stroke="currentColor" strokeWidth="2" />
      <path d="M15 4v16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
