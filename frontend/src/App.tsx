import { Component, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { KanbanPageV2 } from './components/v2/KanbanPageV2';
import { IconRailV2, type AppTabV2 } from './components/v2/layout/IconRailV2';
import { AppShellV2 } from './components/v2/layout/AppShellV2';
import { TopbarLiteV2 } from './components/v2/layout/TopbarLiteV2';
import { ActivityTimeline } from './components/ActivityTimeline';
import { DocsView } from './components/DocsView';
import { useWebSocket } from './hooks/useWebSocket';
import { Toast } from './components/Toast';
import './index.css';

type Tab = AppTabV2;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const tab = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/activity')) return 'activity';
    if (p.startsWith('/docs')) return 'docs';
    return 'kanban';
  }, [location.pathname]);

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

  const setTab = useCallback((t: Tab) => {
    if (t === 'activity') navigate('/activity');
    else if (t === 'docs') navigate('/docs');
    else navigate('/');
  }, [navigate]);

  return (
    <ErrorBoundary>
      <div className="h-full bg-[rgb(var(--cb-bg))]">
        {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}

        <div className="flex h-full">
          <IconRailV2 tab={tab} onTab={setTab} />

          <div className="min-w-0 flex-1">
            <Routes>
              <Route
                path="/"
                element={
                  <KanbanPageV2
                    wsSignal={wsSignal}
                    openTaskId={openTaskId}
                    onOpenTaskConsumed={() => setOpenTaskId(null)}
                  />
                }
              />
              <Route
                path="/project/:projectId"
                element={
                  <KanbanPageV2
                    wsSignal={wsSignal}
                    openTaskId={openTaskId}
                    onOpenTaskConsumed={() => setOpenTaskId(null)}
                  />
                }
              />
              <Route
                path="/activity"
                element={
                  <AppShellV2 topbar={<TopbarLiteV2 title="Activity" subtitle="Timeline" />}>
                    <ActivityTimeline
                      wsSignal={wsSignal}
                      onOpenTask={(id) => {
                        setOpenTaskId(id);
                        navigate('/');
                      }}
                    />
                  </AppShellV2>
                }
              />
              <Route
                path="/docs"
                element={
                  <AppShellV2 topbar={<TopbarLiteV2 title="Docs" subtitle="Workspace documents" />}>
                    <DocsView wsSignal={wsSignal} />
                  </AppShellV2>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
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
