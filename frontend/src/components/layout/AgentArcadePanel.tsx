import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { FloatingPortal, flip, offset, shift, useFloating } from '@floating-ui/react';
import { AgentStatusRow } from './AgentStatusRow';
import { useAgentPresence, type AgentStatus } from './AgentPresenceContext';
import { profileForAgent } from './agentProfile';

const PREVIEW_DOT_CLASS: Record<AgentStatus, string> = {
  thinking: 'bg-amber-400',
  idle: 'bg-emerald-400',
  offline: 'bg-slate-400',
};

type ActivePreview = {
  agentId: string;
  anchorEl: HTMLElement;
};

export function AgentArcadePanel({
  compact = false,
  mobileGrid = false,
  horizontal = false,
  hideHeader = false,
  showNowLine = false,
}: {
  compact?: boolean;
  mobileGrid?: boolean;
  horizontal?: boolean;
  hideHeader?: boolean;
  showNowLine?: boolean;
}) {
  const { agentIds, presenceByAgent, profileSources } = useAgentPresence();
  const [previewState, setPreviewState] = useState<ActivePreview | null>(null);

  const sortedAgentIds = useMemo(() => {
    return [...agentIds].sort((a, b) => {
      const aName = profileForAgent(a, profileSources).displayName.toLowerCase();
      const bName = profileForAgent(b, profileSources).displayName.toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [agentIds, profileSources]);

  const groups = useMemo(() => {
    const thinking: string[] = [];
    const online: string[] = [];
    const offline: string[] = [];

    for (const id of sortedAgentIds) {
      const status = presenceByAgent[id]?.status ?? 'offline';
      if (status === 'thinking') thinking.push(id);
      else if (status === 'offline') offline.push(id);
      else online.push(id);
    }

    return { thinking, online, offline };
  }, [sortedAgentIds, presenceByAgent]);

  const activePreview = useMemo(() => {
    if (!previewState) return null;
    return sortedAgentIds.includes(previewState.agentId) ? previewState : null;
  }, [previewState, sortedAgentIds]);

  const preview = useMemo(() => {
    if (!showNowLine || !activePreview) return null;

    const presence = presenceByAgent[activePreview.agentId];
    const status = presence?.status ?? 'offline';
    const thought = typeof presence?.agentThought === 'string' ? presence.agentThought.trim() : '';
    const text =
      thought ||
      (status === 'thinking'
        ? 'Thinking...'
        : status === 'idle'
          ? 'Idle'
          : presence?.lastActivity
            ? `Last active ${formatRelativeTime(presence.lastActivity)}`
            : 'Offline');
    const displayName = profileForAgent(activePreview.agentId, profileSources).displayName;

    return { displayName, status, text };
  }, [showNowLine, activePreview, presenceByAgent, profileSources]);

  const { refs: floatingRefs, floatingStyles, update } = useFloating({
    open: Boolean(showNowLine && preview),
    placement: 'left-start',
    middleware: [
      offset(10),
      flip({ fallbackPlacements: ['right-start', 'left-end', 'right-end'] }),
      shift({ padding: 8 }),
    ],
  });
  const setFloatingRef = useCallback(
    (node: HTMLElement | null) => {
      floatingRefs.setFloating(node);
    },
    [floatingRefs],
  );

  useEffect(() => {
    if (!showNowLine || !activePreview?.anchorEl) {
      floatingRefs.setReference(null);
      return;
    }

    floatingRefs.setReference(activePreview.anchorEl);
    void update();
  }, [showNowLine, activePreview, floatingRefs, update]);

  useEffect(() => {
    if (!showNowLine || !preview) return;
    const onRelayout = () => {
      void update();
    };
    window.addEventListener('resize', onRelayout);
    window.addEventListener('scroll', onRelayout, true);
    return () => {
      window.removeEventListener('resize', onRelayout);
      window.removeEventListener('scroll', onRelayout, true);
    };
  }, [showNowLine, preview, update]);

  function handlePreviewAgentChange(agentId: string | null, anchorEl?: HTMLElement | null) {
    if (!showNowLine || !agentId || !anchorEl) {
      setPreviewState(null);
      return;
    }
    setPreviewState({ agentId, anchorEl });
  }

  if (horizontal) {
    return (
      <section className="min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-white p-2">
        {!sortedAgentIds.length ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Waiting for agent discovery...
          </div>
        ) : (
          <div className="cb-scrollbar-hidden min-w-0 w-full max-w-full flex gap-1.5 overflow-x-auto overflow-y-hidden pb-1">
            {sortedAgentIds.map((id) => (
              <AgentStatusRow
                key={id}
                agentId={id}
                compact
                slot
                onPreviewAgentChange={showNowLine ? handlePreviewAgentChange : undefined}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  const hasAgents = sortedAgentIds.length > 0;

  return (
    <>
      <section
        className={clsx(
          'min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-white shadow-sm',
          compact ? 'p-2' : 'p-3',
          compact ? 'mx-2 mt-2' : '',
        )}
      >
        {!hideHeader ? (
          <div className="mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Agents</div>
          </div>
        ) : null}

        {!hasAgents ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Waiting for agent discovery...
          </div>
        ) : null}

        {hasAgents ? (
          <div className={clsx(mobileGrid ? 'grid grid-cols-2 gap-2' : 'space-y-2')}>
            {groups.thinking.length ? (
              <AgentGroup title="Thinking" count={groups.thinking.length}>
                {groups.thinking.map((id) => (
                  <AgentStatusRow
                    key={id}
                    agentId={id}
                    compact={compact}
                    showNowLine={showNowLine}
                    highlighted={activePreview?.agentId === id}
                    onPreviewAgentChange={showNowLine ? handlePreviewAgentChange : undefined}
                    className={mobileGrid ? 'min-w-0' : undefined}
                  />
                ))}
              </AgentGroup>
            ) : null}

            {groups.online.length ? (
              <AgentGroup title="Online" count={groups.online.length}>
                {groups.online.map((id) => (
                  <AgentStatusRow
                    key={id}
                    agentId={id}
                    compact={compact}
                    showNowLine={showNowLine}
                    highlighted={activePreview?.agentId === id}
                    onPreviewAgentChange={showNowLine ? handlePreviewAgentChange : undefined}
                    className={mobileGrid ? 'min-w-0' : undefined}
                  />
                ))}
              </AgentGroup>
            ) : null}

            {groups.offline.length ? (
              <AgentGroup title="Offline" count={groups.offline.length}>
                {groups.offline.map((id) => (
                  <AgentStatusRow
                    key={id}
                    agentId={id}
                    compact={compact}
                    showNowLine={showNowLine}
                    highlighted={activePreview?.agentId === id}
                    onPreviewAgentChange={showNowLine ? handlePreviewAgentChange : undefined}
                    className={mobileGrid ? 'min-w-0' : undefined}
                  />
                ))}
              </AgentGroup>
            ) : null}
          </div>
        ) : null}
      </section>

      {showNowLine && preview ? (
        <FloatingPortal>
          <div ref={setFloatingRef} style={floatingStyles} className="pointer-events-none z-[700]">
            <div
              className="relative max-w-[min(25rem,calc(100vw-1rem))] rounded-xl border border-white/35 bg-slate-900/88 px-2.5 py-2 text-slate-50 backdrop-blur-md ring-1 ring-white/15 shadow-[0_16px_34px_-14px_rgba(15,23,42,0.85)]"
              data-testid="agent-rail-floating-popover"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                <span className={clsx('h-1.5 w-1.5 rounded-full', PREVIEW_DOT_CLASS[preview.status])} />
                <span>{preview.displayName}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-4 text-slate-100">
                <span className="mr-1 text-sky-200/95">{'💭'}</span>
                {preview.text}
              </p>
            </div>
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}

function formatRelativeTime(rawIso: string): string {
  const ts = Date.parse(rawIso);
  if (!Number.isFinite(ts)) return 'recently';

  const diffMs = Date.now() - ts;
  if (diffMs < 0) return 'just now';

  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function AgentGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 px-1 text-xs font-semibold text-slate-500">
        {title} - {count}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
