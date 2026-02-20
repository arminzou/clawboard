import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentPresence, useAgentProfile, type AgentPresence, type AgentStatus } from './AgentPresenceContext';
import { normalizeAgentId, pickIdleQuote } from './agentProfile';

const DEFAULT_AGENT_PRESENCE: AgentPresence = {
  status: 'offline',
  lastActivity: null,
  agentThought: null,
};

const STATUS_CONFIG: Record<AgentStatus, { emoji: string; label: string; color: string }> = {
  thinking: { emoji: '🤔', label: 'Thinking', color: 'text-yellow-400' },
  idle:     { emoji: '😴', label: 'Idle',     color: 'text-gray-400' },
  offline:  { emoji: '💤', label: 'Offline',  color: 'text-gray-500' },
};

function formatLastActivity(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function parseTimestampMs(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;
  const ms = new Date(timestamp).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
  const { wsStatus, presenceByAgent, profileSources } = useAgentPresence();
  const profile = useAgentProfile(normalizedAgentId);
  const presence = presenceByAgent[normalizedAgentId] ?? DEFAULT_AGENT_PRESENCE;

  const decorativeQuote = useMemo(
    () => pickIdleQuote(normalizedAgentId, profileSources),
    [normalizedAgentId, profileSources],
  );
  const [thinkingSinceMs, setThinkingSinceMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Dim the card while the WebSocket is not connected — data may be stale.
  const isLive = wsStatus === 'connected';

  useEffect(() => {
    if (presence.status === 'thinking') {
      if (thinkingSinceMs == null) setThinkingSinceMs(parseTimestampMs(presence.lastActivity) ?? Date.now());
      return;
    }
    if (thinkingSinceMs != null) setThinkingSinceMs(null);
  }, [presence.status, presence.lastActivity, thinkingSinceMs]);

  useEffect(() => {
    if (presence.status !== 'thinking') return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [presence.status, thinkingSinceMs]);

  const emoji = profile.avatar;
  const statusCfg = STATUS_CONFIG[presence.status];
  const elapsed = useMemo(() => {
    if (presence.status !== 'thinking' || thinkingSinceMs == null) return null;
    return formatElapsed(nowMs - thinkingSinceMs);
  }, [presence.status, thinkingSinceMs, nowMs]);
  const statusLabel = elapsed ? `${statusCfg.label} · ${elapsed}` : statusCfg.label;
  const thought = presence.agentThought ?? (presence.status === 'idle' ? decorativeQuote : '...');
  const accentStyle =
    presence.status === 'thinking'
      ? undefined
      : { borderColor: profile.borderColor, boxShadow: profile.insetShadow };
  const cardClassName = [
    compact
      ? 'cb-agent-card bg-slate-800 rounded-lg px-2 py-1.5 min-w-[180px] border border-slate-700 transition-opacity duration-300'
      : `cb-agent-card ${slot ? 'cb-agent-card-slot' : 'min-w-[140px]'} bg-slate-800 rounded-lg p-3 text-center border border-slate-700 transition-opacity duration-300`,
    isLive ? 'opacity-100' : 'opacity-60',
    presence.status === 'thinking' ? 'cb-agent-card-thinking' : '',
    className ?? '',
  ].join(' ');

  if (compact) {
    return (
      <button
        type="button"
        className={`${cardClassName} cursor-pointer appearance-none text-left hover:ring-2 hover:ring-amber-300/30`}
        style={accentStyle}
        onClick={() => navigate(`/activity?agent=${encodeURIComponent(normalizedAgentId)}`)}
        aria-label={`Open ${normalizedAgentId} activity`}
      >
        <div className="flex items-center gap-2">
          <div className={`cb-agent-avatar-wrap ${presence.status === 'idle' ? 'cb-agent-avatar-idle' : ''}`}>
            <div className="relative inline-flex items-center justify-center">
              <span className="text-xl leading-none">{emoji}</span>
              {presence.status === 'thinking' && <span className="cb-agent-thinking-ring" aria-hidden />}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm text-white">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: profile.accent }} />
              <span className="truncate font-medium">{profile.displayName}</span>
              <span
                key={presence.status}
                title={statusLabel}
                className={`cb-agent-status inline-flex items-center gap-1 text-xs ${statusCfg.color}`}
              >
                <span>{statusCfg.emoji}</span>
                <span className={elapsed ? '' : 'max-[380px]:hidden'}>{statusLabel}</span>
              </span>
            </div>
            <div className="truncate text-[11px] italic text-slate-300">💭 "{thought}"</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${cardClassName} cursor-pointer appearance-none hover:ring-2 hover:ring-amber-300/30`}
      style={accentStyle}
      onClick={() => navigate(`/activity?agent=${encodeURIComponent(normalizedAgentId)}`)}
      aria-label={`Open ${normalizedAgentId} activity`}
    >
      {/* Avatar */}
      <div className={`cb-agent-avatar-wrap mb-1 ${presence.status === 'idle' ? 'cb-agent-avatar-idle' : ''}`}>
        <div className="relative inline-flex items-center justify-center">
          <span className="text-4xl leading-none">{emoji}</span>
          {presence.status === 'thinking' && <span className="cb-agent-thinking-ring" aria-hidden />}
        </div>
      </div>

      {/* Name */}
      <div className="flex items-center justify-center gap-1.5 text-sm text-white">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: profile.accent }} />
        <span className="font-medium">{profile.displayName}</span>
      </div>

      {/* Status */}
      <div key={presence.status} className={`cb-agent-status text-xs ${statusCfg.color} flex items-center justify-center gap-1`}>
        <span>{statusCfg.emoji}</span>
        <span>{statusLabel}</span>
      </div>

      {/* Thought bubble */}
      <div className="cb-agent-thought mt-2 bg-slate-700 rounded px-2 py-1 text-xs text-slate-300 italic">
        💭 "{thought}"
      </div>

      {/* Last activity */}
      <div className="cb-agent-meta mt-2 text-xs text-slate-500">
        Last: {formatLastActivity(presence.lastActivity)}
      </div>

      {/* Connection indicator */}
      <div className="cb-agent-conn mt-1 text-xs text-slate-500 italic">
        {isLive ? <span className="invisible">Connected</span> : (wsStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...')}
      </div>
    </button>
  );
}
