export type PersonaFlavor = 'methodical' | 'playful' | 'pragmatic';

export type AgentProfile = {
  id: string;
  displayName: string;
  avatar: string;
  accent: string;
  borderColor: string;
  insetShadow: string;
  idleQuotes: string[];
};

export type AgentProfileOverride = {
  displayName?: string;
  avatar?: string;
  accent?: string;
  borderColor?: string;
  insetShadow?: string;
  idleQuotes?: string[];
  persona?: PersonaFlavor;
};

export type AgentProfileSourceMap = Record<string, AgentProfileOverride>;

export type AgentProfileSources = {
  pluginMetadata?: AgentProfileSourceMap;
  config?: AgentProfileSourceMap;
};

const AVATARS = ['🤖', '🦊', '🐼', '🦉', '🐸', '🐙', '🦄', '🐧', '🦦', '🐺'];

const QUOTES: Record<PersonaFlavor, string[]> = {
  methodical: [
    'Checking assumptions before edits.',
    'Reading the file top to bottom.',
    'Verifying edge cases now.',
    'Let me confirm the types first.',
  ],
  playful: [
    'I have a fun idea for this.',
    'Let me try the bold option.',
    'This might be weird, but useful.',
    'Ooh, found a shortcut.',
  ],
  pragmatic: [
    'Going for the smallest safe change.',
    'I can ship this in one pass.',
    'Focus on what unblocks next.',
    'Keep it simple, then iterate.',
  ],
};

const BASE_PROFILE_CACHE = new Map<string, AgentProfile>();

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

export function normalizeAgentId(raw: string): string {
  return String(raw ?? '').trim().toLowerCase();
}

export function normalizeAgentIds(rawIds: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawIds) {
    const id = normalizeAgentId(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function toDisplayName(agentId: string): string {
  return agentId
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function personaForHash(h: number): PersonaFlavor {
  const v = h % 3;
  if (v === 0) return 'methodical';
  if (v === 1) return 'playful';
  return 'pragmatic';
}

export function normalizeProfileSourceMap(source?: AgentProfileSourceMap): AgentProfileSourceMap {
  if (!source) return {};
  const out: AgentProfileSourceMap = {};
  for (const [rawId, rawProfile] of Object.entries(source)) {
    const id = normalizeAgentId(rawId);
    if (!id || !rawProfile || typeof rawProfile !== 'object') continue;

    const next: AgentProfileOverride = {};
    if (typeof rawProfile.displayName === 'string' && rawProfile.displayName.trim()) next.displayName = rawProfile.displayName.trim();
    if (typeof rawProfile.avatar === 'string' && rawProfile.avatar.trim()) next.avatar = rawProfile.avatar.trim();
    if (typeof rawProfile.accent === 'string' && rawProfile.accent.trim()) next.accent = rawProfile.accent.trim();
    if (typeof rawProfile.borderColor === 'string' && rawProfile.borderColor.trim()) next.borderColor = rawProfile.borderColor.trim();
    if (typeof rawProfile.insetShadow === 'string' && rawProfile.insetShadow.trim()) next.insetShadow = rawProfile.insetShadow.trim();
    if (rawProfile.persona === 'methodical' || rawProfile.persona === 'playful' || rawProfile.persona === 'pragmatic') {
      next.persona = rawProfile.persona;
    }
    if (Array.isArray(rawProfile.idleQuotes)) {
      const quotes = rawProfile.idleQuotes
        .filter((q) => typeof q === 'string')
        .map((q) => q.trim())
        .filter(Boolean);
      if (quotes.length) next.idleQuotes = quotes;
    }

    out[id] = next;
  }
  return out;
}

export function normalizeProfileSources(sources?: AgentProfileSources): AgentProfileSources {
  if (!sources) return {};
  return {
    pluginMetadata: normalizeProfileSourceMap(sources.pluginMetadata),
    config: normalizeProfileSourceMap(sources.config),
  };
}

function baseProfileForAgent(agentId: string): AgentProfile {
  const cached = BASE_PROFILE_CACHE.get(agentId);
  if (cached) return cached;

  const id = normalizeAgentId(agentId || 'agent');
  const h = hashString(id);
  const hue = h % 360;
  const flavor = personaForHash(h);
  const base: AgentProfile = {
    id,
    displayName: toDisplayName(id || 'agent'),
    avatar: AVATARS[h % AVATARS.length],
    accent: `hsl(${hue} 82% 62%)`,
    borderColor: `hsl(${hue} 82% 62% / 0.45)`,
    insetShadow: `inset 0 0 0 1px hsl(${hue} 82% 52% / 0.16)`,
    idleQuotes: QUOTES[flavor],
  };
  BASE_PROFILE_CACHE.set(id, base);
  return base;
}

function mergedOverride(agentId: string, sources?: AgentProfileSources): AgentProfileOverride {
  if (!sources) return {};
  const id = normalizeAgentId(agentId);
  const plugin = sources.pluginMetadata?.[id] ?? {};
  const config = sources.config?.[id] ?? {};
  return { ...plugin, ...config };
}

export function profileForAgent(rawId: string, sources?: AgentProfileSources): AgentProfile {
  const id = normalizeAgentId(rawId || 'agent');
  const base = baseProfileForAgent(id);
  const override = mergedOverride(id, sources);
  const personaQuotes = override.persona ? QUOTES[override.persona] : null;
  const idleQuotes = override.idleQuotes?.length ? override.idleQuotes : (personaQuotes ?? base.idleQuotes);

  return {
    id,
    displayName: override.displayName ?? base.displayName,
    avatar: override.avatar ?? base.avatar,
    accent: override.accent ?? base.accent,
    borderColor: override.borderColor ?? override.accent ?? base.borderColor,
    insetShadow: override.insetShadow ?? base.insetShadow,
    idleQuotes,
  };
}

export function pickIdleQuote(agentId: string, sources?: AgentProfileSources): string {
  const profile = profileForAgent(agentId, sources);
  const h = hashString(`${profile.id}-quote`);
  return profile.idleQuotes[h % profile.idleQuotes.length];
}
