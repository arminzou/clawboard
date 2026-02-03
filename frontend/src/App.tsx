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
  const [railPinned, setRailPinned] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('cb.rail.pinned') === '1';
    } catch {
      return false;
    }
  });
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

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.rail.pinned', railPinned ? '1' : '0');
    } catch {
      // ignore
    }
  }, [railPinned]);

  // Toasts are pushed from the WebSocket onMessage handler.

  return (
    <ErrorBoundary>
      <div className="h-full bg-slate-100">
        {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}

        <div className="flex h-full">
          {/* Slim left rail */}
          <aside
            className={
              railPinned
                ? 'group/rail flex w-44 shrink-0 flex-col justify-between border-r border-slate-200 bg-white'
                : 'group/rail flex w-14 shrink-0 flex-col justify-between border-r border-slate-200 bg-white transition-[width] duration-200 ease-out hover:w-44'
            }
          >
            <div className="flex flex-col gap-1 p-2">
              <div
                className="mb-1 flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-2 text-sm font-semibold text-white"
                title="Clawboard"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">C</span>
                <span className="w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/rail:w-auto group-hover/rail:opacity-100">
                  Clawboard
                </span>
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
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>API</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800">
                    {health.checking ? '…' : health.ok ? 'ok' : 'down'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>WS</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800">
                    {wsStatus}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={
                  railPinned
                    ? 'mt-2 flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 hover:bg-slate-50'
                    : 'mt-2 flex w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-800 hover:bg-slate-50'
                }
                onClick={() => setRailPinned((p) => !p)}
                title={railPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                aria-label={railPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                <IconPin filled={railPinned} />
                <span className="w-0 overflow-hidden whitespace-nowrap text-sm opacity-0 transition-all duration-200 group-hover/rail:w-auto group-hover/rail:opacity-100">
                  {railPinned ? 'Unpin' : 'Pin'}
                </span>
              </button>
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
          ? 'relative flex h-10 w-full items-center gap-2 rounded-xl bg-slate-900 px-2 text-white'
          : 'relative flex h-10 w-full items-center gap-2 rounded-xl px-2 text-slate-700 hover:bg-slate-50'
      }
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {active ? <span className="absolute left-0 top-2 h-6 w-1 rounded-r-full bg-white/90" /> : null}
      <span className="flex h-8 w-8 items-center justify-center rounded-lg">{children}</span>
      <span className="w-0 overflow-hidden whitespace-nowrap text-sm opacity-0 transition-all duration-200 group-hover/rail:w-auto group-hover/rail:opacity-100">
        {label}
      </span>
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

function IconPin({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 3l7 7-2 2-2-2-5 5v6l-2-2-2 2v-6l5-5-2-2 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        fill={filled ? 'currentColor' : 'none'}
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
