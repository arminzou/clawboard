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

export function AgentTamagotchi({ agentId = 'tee' }: { agentId?: string }) {
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

  return (
    <div className={`bg-slate-800 rounded-lg p-3 min-w-[140px] text-center border border-slate-700 transition-opacity duration-300 ${isLive ? 'opacity-100' : 'opacity-60'}`}>
      {/* Avatar */}
      <div className="text-4xl mb-1">{emoji}</div>

      {/* Name */}
      <div className="font-medium text-white text-sm capitalize">{agentId}</div>

      {/* Status */}
      <div className={`text-xs ${statusCfg.color} flex items-center justify-center gap-1`}>
        <span>{statusCfg.emoji}</span>
        <span>{statusCfg.label}</span>
      </div>

      {/* Thought bubble */}
      <div className="mt-2 bg-slate-700 rounded px-2 py-1 text-xs text-slate-300 italic">
        💭 "{thought}"
      </div>

      {/* Last activity */}
      <div className="mt-2 text-xs text-slate-500">
        Last: {formatLastActivity(presence.lastActivity)}
      </div>

      {/* Connection indicator */}
      {!isLive && (
        <div className="mt-2 text-xs text-slate-500 italic">
          {wsStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
        </div>
      )}
    </div>
  );
}
