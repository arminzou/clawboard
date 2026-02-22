import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { FloatingPortal, flip, offset, shift, useFloating } from '@floating-ui/react';
import { useAgentPresence } from './AgentPresenceContext';
import { AgentPresenceAvatar } from './AgentPresenceAvatar';
import { profileForAgent } from './agentProfile';

const PREVIEW_DOT_CLASS = {
  thinking: 'bg-amber-400',
  idle: 'bg-emerald-400',
  offline: 'bg-slate-400',
} as const;

export function AgentPresenceStrip({
  horizontal = false,
  autoPopupOnThoughtChange = true,
  className,
}: {
  horizontal?: boolean;
  autoPopupOnThoughtChange?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const { agentIds, presenceByAgent, profileSources } = useAgentPresence();
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [autoPopupAgentId, setAutoPopupAgentId] = useState<string | null>(null);
  const [previewAnchorEl, setPreviewAnchorEl] = useState<HTMLElement | null>(null);
  const autoPopupTimerRef = useRef<number | null>(null);
  const previousThinkingLabelRef = useRef<Record<string, string>>({});
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const sortedAgentIds = useMemo(() => {
    return [...agentIds].sort((a, b) => {
      const aName = profileForAgent(a, profileSources).displayName.toLowerCase();
      const bName = profileForAgent(b, profileSources).displayName.toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [agentIds, profileSources]);

  const previewAgentId = activeAgentId ?? autoPopupAgentId;
  const preview = useMemo(() => {
    if (!previewAgentId) return null;
    const presence = presenceByAgent[previewAgentId];
    const status = presence?.status ?? 'offline';
    const thought = typeof presence?.agentThought === 'string' ? presence.agentThought.trim() : '';
    const text =
      thought ||
      (status === 'thinking'
        ? 'Thinking...'
        : status === 'idle'
          ? 'Idle'
          : 'Offline');
    const displayName = profileForAgent(previewAgentId, profileSources).displayName;
    return { displayName, status, text };
  }, [previewAgentId, presenceByAgent, profileSources]);

  const { refs: floatingRefs, floatingStyles, update } = useFloating({
    open: Boolean(preview && previewAnchorEl),
    placement: horizontal ? 'top' : 'left-start',
    middleware: [
      offset(10),
      flip({
        fallbackPlacements: horizontal
          ? ['bottom', 'top-start', 'bottom-start']
          : ['right-start', 'left-end', 'right-end'],
      }),
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
    if (!preview || !previewAnchorEl) {
      floatingRefs.setReference(null);
      return;
    }
    floatingRefs.setReference(previewAnchorEl);
    void update();
  }, [preview, previewAnchorEl, floatingRefs, update]);

  useEffect(() => {
    if (!preview) return;
    const onRelayout = () => {
      void update();
    };
    window.addEventListener('resize', onRelayout);
    window.addEventListener('scroll', onRelayout, true);
    return () => {
      window.removeEventListener('resize', onRelayout);
      window.removeEventListener('scroll', onRelayout, true);
    };
  }, [preview, update]);

  useEffect(() => {
    if (!autoPopupOnThoughtChange) return;

    const nextLabels: Record<string, string> = {};
    let changedAgentId: string | null = null;

    for (const agentId of sortedAgentIds) {
      const presence = presenceByAgent[agentId];
      const status = presence?.status ?? 'offline';
      const thought = typeof presence?.agentThought === 'string' ? presence.agentThought.trim() : '';
      const thinkingLabel = status === 'thinking' ? (thought || 'Thinking...') : '';
      nextLabels[agentId] = thinkingLabel;

      const prevLabel = previousThinkingLabelRef.current[agentId];
      if (prevLabel !== undefined && thinkingLabel && thinkingLabel !== prevLabel) {
        changedAgentId = agentId;
      }
    }

    previousThinkingLabelRef.current = nextLabels;
    if (!changedAgentId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- driven by external websocket/presence updates
    setAutoPopupAgentId(changedAgentId);
    if (!activeAgentId) {
      setPreviewAnchorEl(buttonRefs.current[changedAgentId] ?? null);
    }
    if (autoPopupTimerRef.current != null) window.clearTimeout(autoPopupTimerRef.current);
    autoPopupTimerRef.current = window.setTimeout(() => {
      setAutoPopupAgentId((current) => (current === changedAgentId ? null : current));
      autoPopupTimerRef.current = null;
    }, 2800);
  }, [autoPopupOnThoughtChange, sortedAgentIds, presenceByAgent, activeAgentId]);

  useEffect(() => {
    return () => {
      if (autoPopupTimerRef.current != null) window.clearTimeout(autoPopupTimerRef.current);
    };
  }, []);

  if (!sortedAgentIds.length) {
    return (
      <div className={clsx('text-center text-[11px] text-slate-500', className)}>
        No agents
      </div>
    );
  }

  return (
    <>
      <div
        className={clsx(
          horizontal
            ? 'cb-scrollbar-hidden relative flex flex-wrap items-center gap-1.5 overflow-visible'
            : 'cb-scrollbar-hidden relative flex flex-col items-center gap-1.5 overflow-visible',
          className,
        )}
      >
        {sortedAgentIds.map((agentId) => {
          const profile = profileForAgent(agentId, profileSources);
          const status = presenceByAgent[agentId]?.status ?? 'offline';
          const highlighted = previewAgentId === agentId;
          return (
            <button
              key={agentId}
              ref={(el) => {
                buttonRefs.current[agentId] = el;
              }}
              type="button"
              className={clsx(
                'group relative inline-flex shrink-0 items-center justify-center rounded-md transition hover:brightness-[0.985] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300',
                highlighted ? 'bg-slate-100 ring-1 ring-slate-300/85' : null,
              )}
              onClick={() => navigate(`/activity?agent=${encodeURIComponent(agentId)}`)}
              onMouseEnter={(event) => {
                setActiveAgentId(agentId);
                setPreviewAnchorEl(event.currentTarget);
              }}
              onMouseLeave={() => setActiveAgentId((prev) => (prev === agentId ? null : prev))}
              onFocus={(event) => {
                setActiveAgentId(agentId);
                setPreviewAnchorEl(event.currentTarget);
              }}
              onBlur={() => setActiveAgentId((prev) => (prev === agentId ? null : prev))}
              aria-label={`Open ${profile.displayName} activity`}
            >
              <AgentPresenceAvatar avatar={profile.avatar} status={status} highlightStatus={highlighted} />
            </button>
          );
        })}
      </div>

      {preview && previewAnchorEl ? (
        <FloatingPortal>
          <div ref={setFloatingRef} style={floatingStyles} className="pointer-events-none z-[700]">
            <div
              className="relative max-w-[min(25rem,calc(100vw-1rem))] rounded-xl border border-white/35 bg-slate-900/88 px-2.5 py-2 text-slate-50 backdrop-blur-md ring-1 ring-white/15 shadow-[0_16px_34px_-14px_rgba(15,23,42,0.85)]"
              data-testid={horizontal ? 'agent-strip-floating-popover-horizontal' : 'agent-strip-floating-popover'}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                <span
                  className={clsx(
                    'h-1.5 w-1.5 rounded-full',
                    PREVIEW_DOT_CLASS[preview.status],
                  )}
                />
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
