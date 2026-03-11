import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { KanbanPage } from './pages/Kanban/KanbanPage';
import { IconRail, type AppTab } from './components/layout/IconRail';
import { MobileNavDrawer } from './components/layout/MobileNavDrawer';
import { AppShell } from './components/layout/AppShell';
import { TopbarLite } from './components/layout/TopbarLite';
import { ActivityTimeline } from './pages/Activity/ActivityTimeline';
import { DocsView } from './pages/Docs/DocsView';
import { InboxPage } from './pages/Inbox/InboxPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { AttentionPage } from './pages/Attention/AttentionPage';
import { ThreadDetailPage } from './pages/Threads/ThreadDetailPage';
import { ToastContainer } from './components/ui/Toast';
import { useWebSocket } from './hooks/useWebSocket';
import { useTheme } from './hooks/useTheme';
import { toast } from './lib/toast';
import { api } from './lib/api';
import { normalizeAgentIds, normalizeProfileSources, type AgentProfileSources } from './components/layout/agentProfile';
import { WebSocketStatusIndicator } from './components/layout/WebSocketStatusIndicator';
import './index.css';

type Tab = AppTab;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const tab = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/attention')) return 'attention';
    if (p.startsWith('/threads/')) return 'attention';
    if (p.startsWith('/inbox')) return 'inbox';
    if (p.startsWith('/activity')) return 'activity';
    if (p.startsWith('/docs')) return 'docs';
    if (p.startsWith('/settings')) return 'settings';
    return 'kanban';
  }, [location.pathname]);

  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [initialAgentIds, setInitialAgentIds] = useState<string[]>([]);
  const [agentProfileSources, setAgentProfileSources] = useState<AgentProfileSources>({});
  const { resolvedTheme, toggleTheme } = useTheme();

  const pushToast = useCallback((msg: string) => {
    toast.show(msg);
  }, []);

  const { lastMessage, status: wsStatus, lastReceivedAt, reconnectAttempts, reconnectNow } = useWebSocket({
    onMessage: (m) => {
      const t = String(m.type || '');
      if (t === 'tasks_newly_unblocked') {
        const dependents = Array.isArray((m.data as { dependents?: unknown })?.dependents)
          ? ((m.data as { dependents?: Array<{ title?: string; id?: number }> }).dependents ?? [])
          : [];
        if (dependents.length > 0) {
          const labels = dependents.slice(0, 2).map((d) => d.title ?? `#${d.id ?? '?'}`);
          const suffix = dependents.length > 2 ? ` +${dependents.length - 2} more` : '';
          pushToast(`Newly unblocked: ${labels.join(', ')}${suffix}`);
          return;
        }
      }
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
    if (t === 'attention') navigate('/attention');
    else if (t === 'inbox') navigate('/inbox');
    else if (t === 'activity') navigate('/activity');
    else if (t === 'docs') navigate('/docs');
    else if (t === 'settings') navigate('/settings');
    else navigate('/');
  }, [navigate]);

  return (
    <ErrorBoundary>
      <div className="h-full bg-[rgb(var(--cb-bg))]">
        <ToastContainer />
        <WebSocketStatusIndicator
          status={wsStatus}
          reconnectAttempts={reconnectAttempts}
          lastReceivedAt={lastReceivedAt}
          onReconnect={reconnectNow}
        />

        <div className="flex h-full">
          {/* Desktop nav rail */}
          <div className="hidden md:flex">
            <IconRail
              tab={tab}
              onTab={setTab}
              theme={resolvedTheme}
              onToggleTheme={toggleTheme}
              showAttention={true}
            />
          </div>

          {/* Mobile nav (hamburger drawer) */}
          <MobileNavDrawer
            tab={tab}
            onTab={setTab}
            theme={resolvedTheme}
            onToggleTheme={toggleTheme}
            showAttention={true}
          />

          <div className="min-w-0 flex-1">
            <Routes>
                                <Route
                    path="/attention"
                    element={
                      <AppShell
                        topbar={<TopbarLite title="My Attention" subtitle="Thread-first collaboration" />}
                        wsSignal={wsSignal}
                        wsStatus={wsStatus}
                        initialAgentIds={initialAgentIds}
                        agentProfileSources={agentProfileSources}
                      >
                        <AttentionPage wsSignal={wsSignal} />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/threads/:threadId"
                    element={
                      <AppShell
                        topbar={<TopbarLite title="Thread" subtitle="Details + timeline" />}
                        wsSignal={wsSignal}
                        wsStatus={wsStatus}
                        initialAgentIds={initialAgentIds}
                        agentProfileSources={agentProfileSources}
                      >
                        <ThreadDetailPage wsSignal={wsSignal} />
                      </AppShell>
                    }
                  />
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
                path="/inbox"
                element={
                  <AppShell
                    topbar={<TopbarLite title="Inbox" subtitle="Personal reminders and checklist tasks" />}
                    wsSignal={wsSignal}
                    wsStatus={wsStatus}
                    initialAgentIds={initialAgentIds}
                    agentProfileSources={agentProfileSources}
                  >
                    <InboxPage wsSignal={wsSignal} />
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
              <Route
                path="/settings"
                element={
                  <AppShell
                    topbar={<TopbarLite title="Settings" subtitle="Workspace and agent preferences" />}
                    wsSignal={wsSignal}
                    wsStatus={wsStatus}
                    initialAgentIds={initialAgentIds}
                    agentProfileSources={agentProfileSources}
                  >
                    <SettingsPage />
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
