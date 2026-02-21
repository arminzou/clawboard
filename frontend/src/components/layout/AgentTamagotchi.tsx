import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentPresence, useAgentProfile, type AgentPresence, type AgentStatus } from './AgentPresenceContext';
import { normalizeAgentId, pickIdleQuote } from './agentProfile';

const DEFAULT_AGENT_PRESENCE: AgentPresence = {
  status: 'offline',
  lastActivity: null,
  agentThought: null,
};

const STATUS_DOT_CLASS: Record<AgentStatus, string> = {
  thinking: 'bg-amber-400',
  idle: 'bg-emerald-400',
  offline: 'bg-slate-400',
};

function shouldShowAppBadge(agentId: string): boolean {
  return ['tee', 'fay', 'docky', 'main'].includes(agentId);
}

export function AgentTamagotchi({
  agentId = 'agent',
  compact = false,
  slot = false,
  className,
}: {
  agentId?: string;
  compact?: boolean;
  slot?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const normalizedAgentId = normalizeAgentId(agentId || 'agent');
  const { presenceByAgent, profileSources } = useAgentPresence();
  const profile = useAgentProfile(normalizedAgentId);
  const presence = presenceByAgent[normalizedAgentId] ?? DEFAULT_AGENT_PRESENCE;

  const fallbackThought = useMemo(
    () => pickIdleQuote(normalizedAgentId, profileSources),
    [normalizedAgentId, profileSources],
  );
  const thought = presence.agentThought ?? (presence.status === 'idle' ? fallbackThought : null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [bubbleFlash, setBubbleFlash] = useState(false);
  const prevStatusRef = useRef<AgentStatus>(presence.status);
  const bubbleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const enteredThinking = prev !== 'thinking' && presence.status === 'thinking';
    prevStatusRef.current = presence.status;
    if (!enteredThinking) return;

    setBubbleFlash(true);
    if (bubbleTimerRef.current != null) window.clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = window.setTimeout(() => {
      setBubbleFlash(false);
      bubbleTimerRef.current = null;
    }, 4200);
  }, [presence.status]);

  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current != null) window.clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  const showBubble = (hovered || focused || bubbleFlash) && !!thought && presence.status !== 'offline';
  const showBadge = shouldShowAppBadge(normalizedAgentId);

  return (
    <button
      type="button"
      className={[
        'group relative flex items-center gap-2 rounded-md px-2 py-1 text-left transition',
        'hover:bg-slate-100 active:bg-slate-200 focus-visible:bg-slate-100',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300',
        compact ? 'min-h-8' : 'min-h-9',
        slot ? 'w-[190px] shrink-0' : 'w-full',
        presence.status === 'offline' ? 'opacity-55' : '',
        className ?? '',
      ].join(' ')}
      onClick={() => navigate(`/activity?agent=${encodeURIComponent(normalizedAgentId)}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label={`Open ${profile.displayName} activity`}
    >
      <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-sm">
        <span className="leading-none">{profile.avatar}</span>
        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${STATUS_DOT_CLASS[presence.status]}`} />
      </span>

      <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
        {profile.displayName}
      </span>

      {showBadge ? (
        <span className="rounded bg-indigo-500 px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide text-white">
          APP
        </span>
      ) : null}

      {showBubble ? (
        <span
          className="pointer-events-none absolute left-2 top-0 z-20 w-[220px] -translate-y-[calc(100%+8px)] rounded-md border border-slate-300 bg-white px-2 py-1 text-left text-[11px] leading-tight text-slate-700 shadow-lg"
          role="status"
          aria-live="polite"
        >
          {thought}
        </span>
      ) : null}

      {showBubble ? (
        <span
          className="pointer-events-none absolute left-4 top-0 z-20 -translate-y-1 border-x-[5px] border-t-[6px] border-x-transparent border-t-white"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

