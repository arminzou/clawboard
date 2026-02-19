import { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

type AgentStatus = 'active' | 'thinking' | 'idle' | 'blocked' | 'offline';

interface AgentPresence {
  agent: string;
  status: AgentStatus;
  lastActivity: string | null;
  currentTask?: string;
  thought?: string;
}

// Random motivational thoughts for the agent
const AGENT_THOUGHTS = [
  "Just finished a feature! 🎉",
  "Debugging is like being a detective...",
  "Writing tests is a love letter to your future self",
  "Clean code is happy code",
  "Ship it! 🚀",
  "One bug at a time",
  "Coffee + Code = ❤️",
  "Making things work, one commit at a time",
];

const AGENT_EMOJIS: Record<string, string> = {
  tee: '🐱',
  fay: '🐱',
  armin: '👤',
};

const STATUS_CONFIG: Record<AgentStatus, { emoji: string; label: string; color: string }> = {
  active: { emoji: '😊', label: 'Active', color: 'text-green-400' },
  thinking: { emoji: '🤔', label: 'Thinking', color: 'text-yellow-400' },
  idle: { emoji: '😴', label: 'Idle', color: 'text-gray-400' },
  blocked: { emoji: '😰', label: 'Blocked', color: 'text-red-400' },
  offline: { emoji: '💤', label: 'Offline', color: 'text-gray-500' },
};

function getRandomThought(): string {
  return AGENT_THOUGHTS[Math.floor(Math.random() * AGENT_THOUGHTS.length)];
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

function getApiKey(): string {
  // Try to get API key from env or localStorage
  return import.meta.env.VITE_CLAWBOARD_API_KEY || localStorage.getItem('apiKey') || '';
}

function getApiBase(): string {
  return import.meta.env.VITE_API_BASE || '';
}

export function AgentTamagotchi({ agentId = 'tee' }: { agentId?: string }) {
  const [presence, setPresence] = useState<AgentPresence>({
    agent: agentId,
    status: 'idle',
    lastActivity: null,
    thought: getRandomThought(),
  });

  // Listen to WebSocket events for real-time updates
  useWebSocket({
    onMessage: (event) => {
      if (event.type === 'agent_status_updated') {
        const data = event.data as { agentId?: string; status?: AgentStatus; lastActivity?: string; thought?: string };
        if (data.agentId === agentId) {
          setPresence(prev => ({
            ...prev,
            status: data.status || prev.status,
            lastActivity: data.lastActivity || prev.lastActivity,
            thought: data.thought || prev.thought || getRandomThought(),
          }));
        }
      }
    }
  });

  useEffect(() => {
    // Poll for initial agent status
    const fetchStatus = async () => {
      try {
        const apiKey = getApiKey();
        const apiBase = getApiBase();
        const url = apiBase ? `${apiBase}/api/openclaw/status` : '/api/openclaw/status';
        
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.agents?.includes(agentId)) {
            setPresence(prev => ({
              ...prev,
              status: 'idle',
              thought: prev.thought || getRandomThought(),
            }));
          }
        }
      } catch {
        setPresence(prev => ({ ...prev, status: 'offline' }));
      }
    };

    fetchStatus();
  }, [agentId]);

  const emoji = AGENT_EMOJIS[agentId] || '🤖';
  const config = STATUS_CONFIG[presence.status];

  return (
    <div className="bg-slate-800 rounded-lg p-3 min-w-[140px] text-center border border-slate-700">
      {/* Avatar */}
      <div className="text-4xl mb-1">{emoji}</div>
      
      {/* Name */}
      <div className="font-medium text-white text-sm capitalize">{agentId}</div>
      
      {/* Status */}
      <div className={`text-xs ${config.color} flex items-center justify-center gap-1`}>
        <span>{config.emoji}</span>
        <span>{config.label}</span>
      </div>
      
      {/* Thought bubble */}
      <div className="mt-2 bg-slate-700 rounded px-2 py-1 text-xs text-slate-300 italic">
        💭 "{presence.thought}"
      </div>
      
      {/* Last activity */}
      <div className="mt-2 text-xs text-slate-500">
        Last: {formatLastActivity(presence.lastActivity)}
      </div>
      
      {/* Energy bar (decorative) */}
      <div className="mt-2">
        <div className="text-xs text-slate-500 mb-1">Energy</div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
            style={{ width: presence.status === 'active' ? '85%' : presence.status === 'thinking' ? '60%' : '30%' }}
          />
        </div>
      </div>
    </div>
  );
}
