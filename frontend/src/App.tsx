import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { KanbanPage } from './pages/Kanban/KanbanPage';
import { IconRail, type AppTab } from './components/layout/IconRail';
import { AppShell } from './components/layout/AppShell';
import { TopbarLite } from './components/layout/TopbarLite';
import { ActivityTimeline } from './pages/Activity/ActivityTimeline';
import { DocsView } from './pages/Docs/DocsView';
import { ToastContainer } from './components/ui/Toast';
import { useWebSocket } from './hooks/useWebSocket';
import { toast } from './lib/toast';
import { api } from './lib/api';
import { normalizeAgentIds, normalizeProfileSources, type AgentProfileSources } from './components/layout/agentProfile';
import './index.css';

type Tab = AppTab;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const tab = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/activity')) return 'activity';
    if (p.startsWith('/docs')) return 'docs';
    return 'kanban';
  }, [location.pathname]);

  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [initialAgentIds, setInitialAgentIds] = useState<string[]>([]);
  const [agentProfileSources, setAgentProfileSources] = useState<AgentProfileSources>({});

  const pushToast = useCallback((msg: string) => {
    toast.show(msg);
  }, []);

  const { lastMessage, status: wsStatus } = useWebSocket({
    onMessage: (m) => {
      const t = String(m.type || '');
      if (t.startsWith('task_')) pushToast(`Tasks updated (${t})`);
    },
  });

  const wsSignal = useMemo(() => lastMessage, [lastMessage]);

  useEffect(() => {
    let cancelled = false;
    api
      .getOpenClawStatus()
      .then((status) => {
        if (cancelled) return;
        const pluginProfiles = status.pluginAgentProfiles ?? {};
        const configProfiles = status.agentProfiles ?? {};
        setAgentProfileSources(
          normalizeProfileSources({
            pluginMetadata: pluginProfiles,
            config: configProfiles,
          }),
        );
        setInitialAgentIds(normalizeAgentIds([
          ...(status.agents ?? []),
          ...Object.keys(pluginProfiles),
          ...Object.keys(configProfiles),
        ]));
      })
      .catch(() => {
        if (cancelled) return;
        setInitialAgentIds([]);
        setAgentProfileSources({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTab = useCallback((t: Tab) => {
    if (t === 'activity') navigate('/activity');
    else if (t === 'docs') navigate('/docs');
    else navigate('/');
  }, [navigate]);

  return (
    <ErrorBoundary>
      <div className="h-full bg-[rgb(var(--cb-bg))]">
        <ToastContainer />

        <div className="flex h-full">
          <IconRail tab={tab} onTab={setTab} />

          <div className="min-w-0 flex-1">
            <Routes>
              <Route
                path="/"
                element={
                  <KanbanPage
                    wsSignal={wsSignal}
                    wsStatus={wsStatus}
                    initialAgentIds={initialAgentIds}
                    agentProfileSources={agentProfileSources}
                    openTaskId={openTaskId}
                    onOpenTaskConsumed={() => setOpenTaskId(null)}
                  />
                }
              />
              <Route
                path="/project/:projectId"
                element={
                  <KanbanPage
                    wsSignal={wsSignal}
                    wsStatus={wsStatus}
                    initialAgentIds={initialAgentIds}
                    agentProfileSources={agentProfileSources}
                    openTaskId={openTaskId}
                    onOpenTaskConsumed={() => setOpenTaskId(null)}
                  />
                }
              />
              <Route
                path="/activity"
                element={
                  <AppShell
                    topbar={<TopbarLite title="Activity" subtitle="Timeline" />}
                    wsSignal={wsSignal}
                    wsStatus={wsStatus}
                    initialAgentIds={initialAgentIds}
                    agentProfileSources={agentProfileSources}
                  >
                    <ActivityTimeline
                      wsSignal={wsSignal}
                      onOpenTask={(id) => {
                        setOpenTaskId(id);
                        navigate('/');
                      }}
                    />
                  </AppShell>
                }
              />
              <Route
                path="/docs"
                element={
                  <AppShell
                    topbar={<TopbarLite title="Docs" subtitle="Workspace documents" />}
                    wsSignal={wsSignal}
                    wsStatus={wsStatus}
                    initialAgentIds={initialAgentIds}
                    agentProfileSources={agentProfileSources}
                  >
                    <DocsView wsSignal={wsSignal} />
                  </AppShell>
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
