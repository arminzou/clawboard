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

        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3">
            <div>
              <div className="text-base font-semibold text-slate-900">Clawboard</div>
              <div className="text-xs text-slate-500">
                API: {health.checking ? 'checking' : health.ok ? 'ok' : 'down'} • WS: {wsStatus}
              </div>
            </div>
            <div className="flex gap-2">
              <TabButton active={tab === 'kanban'} onClick={() => setTab('kanban')}>Kanban</TabButton>
              <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>Activity</TabButton>
              <TabButton active={tab === 'docs'} onClick={() => setTab('docs')}>Docs</TabButton>
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
      </div>
    </ErrorBoundary>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className={
        active
          ? 'rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white'
          : 'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50'
      }
      onClick={onClick}
    >
      {children}
    </button>
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
