import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentPresence, useAgentProfile, type AgentPresence } from './AgentPresenceContext';
import { AgentPresenceAvatar } from './AgentPresenceAvatar';
import { normalizeAgentId, pickIdleQuote } from './agentProfile';

const DEFAULT_AGENT_PRESENCE: AgentPresence = {
  status: 'offline',
  lastActivity: null,
  agentThought: null,
};

export function AgentTamagotchi({
  agentId = 'agent',
  compact = false,
  slot = false,
  showNowLine = false,
  highlighted = false,
  onPreviewAgentChange,
  className,
}: {
  agentId?: string;
  compact?: boolean;
  slot?: boolean;
  showNowLine?: boolean;
  highlighted?: boolean;
  onPreviewAgentChange?: (agentId: string | null, anchorEl?: HTMLElement | null) => void;
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
  const nowLine = useMemo(() => {
    if (presence.status === 'thinking') return thought?.trim() || 'Thinking...';
    if (presence.status === 'idle') return 'Idle';
    return presence.lastActivity ? `Last active ${formatRelativeTime(presence.lastActivity)}` : 'Offline';
  }, [presence.status, presence.lastActivity, thought]);

  return (
    <button
      type="button"
      className={[
        'group relative flex items-center gap-2 rounded-md px-2 text-left transition',
        'hover:bg-slate-100 active:bg-slate-200 focus-visible:bg-slate-100',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300',
        highlighted ? 'bg-slate-100 ring-1 ring-slate-300/85' : '',
        showNowLine ? 'min-h-11 py-1.5' : (compact ? 'min-h-8 py-1' : 'min-h-9 py-1'),
        slot ? 'w-[190px] shrink-0' : 'w-full',
        presence.status === 'offline' ? 'opacity-55' : '',
        className ?? '',
      ].join(' ')}
      onClick={() => navigate(`/activity?agent=${encodeURIComponent(normalizedAgentId)}`)}
      onMouseEnter={(event) => onPreviewAgentChange?.(normalizedAgentId, event.currentTarget)}
      onMouseLeave={() => onPreviewAgentChange?.(null, null)}
      onFocus={(event) => onPreviewAgentChange?.(normalizedAgentId, event.currentTarget)}
      onBlur={() => onPreviewAgentChange?.(null, null)}
      aria-label={`Open ${profile.displayName} activity`}
    >
      <AgentPresenceAvatar avatar={profile.avatar} status={presence.status} highlightStatus={highlighted} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-slate-800">{profile.displayName}</span>
        {showNowLine ? (
          <span className="block truncate text-[11px] leading-6 text-slate-500">{nowLine}</span>
        ) : null}
      </span>
    </button>
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
