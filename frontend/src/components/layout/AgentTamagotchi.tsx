import { useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

type AgentStatus = 'thinking' | 'idle' | 'offline';

interface AgentPresence {
  status: AgentStatus;
  lastActivity: string | null;
  agentThought: string | null;
}

const AGENT_EMOJIS: Record<string, string> = {
  tee: '🐱',
  fay: '🐱',
  armin: '👤',
};

const STATUS_CONFIG: Record<AgentStatus, { emoji: string; label: string; color: string }> = {
  thinking: { emoji: '🤔', label: 'Thinking', color: 'text-yellow-400' },
  idle:     { emoji: '😴', label: 'Idle',     color: 'text-gray-400' },
  offline:  { emoji: '💤', label: 'Offline',  color: 'text-gray-500' },
};

// Stable decorative quote — shown when no real agent thought is available.
// Chosen once per mount so it doesn't flash on every status change.
const DECORATIVE_QUOTES = [
  "Debugging is like being a detective...",
  "Writing tests is a love letter to your future self",
  "Clean code is happy code",
  "One bug at a time",
  "Making things work, one commit at a time",
];
function pickQuote(): string {
  return DECORATIVE_QUOTES[Math.floor(Math.random() * DECORATIVE_QUOTES.length)];
}

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

export function AgentTamagotchi({
  agentId = 'tee',
  compact = false,
  slot = false,
  className,
}: {
  agentId?: string;
  compact?: boolean;
  slot?: boolean;
  className?: string;
}) {
  // Start offline — the gateway_start webhook / WebSocket event will bring us online.
  const [presence, setPresence] = useState<AgentPresence>({
    status: 'offline',
    lastActivity: null,
    agentThought: null,
  });

  // Chosen once on mount, stable for the lifetime of this widget.
  const [decorativeQuote] = useState(pickQuote);

  const { status: wsStatus } = useWebSocket({
    onMessage: (event) => {
      if (event.type !== 'agent_status_updated') return;

      const data = event.data as {
        agentId?: string;
        status?: AgentStatus;
        lastActivity?: string;
        thought?: string;
      };

      // Accept both exact match and the gateway '*' wildcard broadcast.
      if (data.agentId !== agentId && data.agentId !== '*') return;

      const incomingStatus = data.status;
      if (!incomingStatus) return;

      setPresence(prev => ({
        status: incomingStatus,
        lastActivity: data.lastActivity ?? prev.lastActivity,
        // Keep agentThought on idle (preserve last known output).
        // Clear it on offline (agent is gone).
        agentThought: incomingStatus === 'offline'
          ? null
          : data.thought ?? prev.agentThought,
      }));
    },
  });

  // Dim the card while the WebSocket is not connected — data may be stale.
  const isLive = wsStatus === 'connected';

  const emoji = AGENT_EMOJIS[agentId] ?? '🤖';
  const statusCfg = STATUS_CONFIG[presence.status];
  const thought = presence.agentThought ?? decorativeQuote;
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
      <div className={cardClassName}>
        <div className="flex items-center gap-2">
          <div className={`cb-agent-avatar-wrap ${presence.status === 'idle' ? 'cb-agent-avatar-idle' : ''}`}>
            <div className="relative inline-flex items-center justify-center">
              <span className="text-xl leading-none">{emoji}</span>
              {presence.status === 'thinking' && <span className="cb-agent-thinking-ring" aria-hidden />}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm text-white">
              <span className="truncate font-medium capitalize">{agentId}</span>
              <span
                key={presence.status}
                title={statusCfg.label}
                className={`cb-agent-status inline-flex items-center gap-1 text-xs ${statusCfg.color}`}
              >
                <span>{statusCfg.emoji}</span>
                <span className="max-[380px]:hidden">{statusCfg.label}</span>
              </span>
            </div>
            <div className="truncate text-[11px] italic text-slate-300">💭 "{thought}"</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClassName}>
      {/* Avatar */}
      <div className={`cb-agent-avatar-wrap mb-1 ${presence.status === 'idle' ? 'cb-agent-avatar-idle' : ''}`}>
        <div className="relative inline-flex items-center justify-center">
          <span className="text-4xl leading-none">{emoji}</span>
          {presence.status === 'thinking' && <span className="cb-agent-thinking-ring" aria-hidden />}
        </div>
      </div>

      {/* Name */}
      <div className="font-medium text-white text-sm capitalize">{agentId}</div>

      {/* Status */}
      <div key={presence.status} className={`cb-agent-status text-xs ${statusCfg.color} flex items-center justify-center gap-1`}>
        <span>{statusCfg.emoji}</span>
        <span>{statusCfg.label}</span>
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
    </div>
  );
}
