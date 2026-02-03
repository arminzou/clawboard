import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KanbanPageV2 } from './components/v2/KanbanPageV2';
import { IconRailV2, type AppTabV2 } from './components/v2/layout/IconRailV2';
import { ActivityTimeline } from './components/ActivityTimeline';
import { DocsView } from './components/DocsView';
import { useWebSocket } from './hooks/useWebSocket';
import { Toast } from './components/Toast';
import './index.css';

type Tab = AppTabV2;

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
      <div className="h-full bg-[rgb(var(--cb-bg))]">
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
