import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Use cwd as backend root - app starts from backend/ in both dev and prod
const BACKEND_ROOT = process.cwd();

// Lazy resolver - called at runtime, not module load
function resolveDbPath(): string {
  const raw = process.env.CLAWBOARD_DB_PATH;
  if (raw) {
    // Relative to backend root, or absolute
    return raw.startsWith('/') ? raw : path.resolve(BACKEND_ROOT, raw);
  }
  // Default: ~/.local/share/clawboard/clawboard.db
  return path.join(os.homedir(), '.local', 'share', 'clawboard', 'clawboard.db');
}

// db/ lives at backend-root/db/
const DB_DIR = path.join(BACKEND_ROOT, 'db');

// OpenClaw detection
const OPENCLAW_DIRS = [
  process.env.OPENCLAW_HOME,
  path.join(os.homedir(), '.openclaw'),
  path.join(os.homedir(), '.config', 'openclaw'),
].filter(Boolean);

type PersonaFlavor = 'methodical' | 'playful' | 'pragmatic';

export type AgentProfileHint = {
  displayName?: string;
  avatar?: string;
  accent?: string;
  borderColor?: string;
  insetShadow?: string;
  idleQuotes?: string[];
  persona?: PersonaFlavor;
};

export type AgentProfileMap = Record<string, AgentProfileHint>;
export type AgentIncludeList = string[] | null;

function detectOpenClaw(): { detected: boolean; home: string | null; agents: string[] } {
  for (const dir of OPENCLAW_DIRS) {
    if (dir && fs.existsSync(dir)) {
      // Detect agents by scanning workspace-*
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const agents = entries
        .filter((e) => e.isDirectory() && e.name.startsWith('workspace-'))
        .map((e) => e.name.replace('workspace-', ''));

      console.log(`[config] OpenClaw detected at ${dir}, agents: ${agents.join(', ')}`);
      return { detected: true, home: dir, agents };
    }
  }
  return { detected: false, home: null, agents: [] };
}

function normalizeAgentId(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

function normalizeAgentIds(rawIds: string[]): string[] {
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

function readAgentProfileFile(filePath: string | null): AgentProfileMap {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const out: AgentProfileMap = {};
    for (const [rawId, rawValue] of Object.entries(parsed)) {
      const id = normalizeAgentId(rawId);
      if (!id || !rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) continue;

      const value = rawValue as Record<string, unknown>;
      const hint: AgentProfileHint = {};

      if (typeof value.displayName === 'string' && value.displayName.trim()) hint.displayName = value.displayName.trim();
      if (typeof value.avatar === 'string' && value.avatar.trim()) hint.avatar = value.avatar.trim();
      if (typeof value.accent === 'string' && value.accent.trim()) hint.accent = value.accent.trim();
      if (typeof value.borderColor === 'string' && value.borderColor.trim()) hint.borderColor = value.borderColor.trim();
      if (typeof value.insetShadow === 'string' && value.insetShadow.trim()) hint.insetShadow = value.insetShadow.trim();
      if (value.persona === 'methodical' || value.persona === 'playful' || value.persona === 'pragmatic') {
        hint.persona = value.persona;
      }

      if (Array.isArray(value.idleQuotes)) {
        const quotes = value.idleQuotes
          .filter((q): q is string => typeof q === 'string')
          .map((q) => q.trim())
          .filter(Boolean);
        if (quotes.length) hint.idleQuotes = quotes;
      }

      out[id] = hint;
    }

    return out;
  } catch (err) {
    console.warn(`[config] Failed to parse agent profile file ${filePath}:`, err);
    return {};
  }
}

function resolveClawboardAgentProfilesPath(): string {
  const raw = process.env.CLAWBOARD_AGENT_PROFILES_PATH;
  if (raw) return raw.startsWith('/') ? raw : path.resolve(BACKEND_ROOT, raw);
  return path.join(getClawboardDir(), 'agent-profiles.json');
}

function resolvePluginAgentProfilesPath(): string | null {
  if (process.env.OPENCLAW_AGENT_PROFILES_PATH) {
    const raw = process.env.OPENCLAW_AGENT_PROFILES_PATH;
    return raw.startsWith('/') ? raw : path.resolve(BACKEND_ROOT, raw);
  }
  if (!config.openclaw.home) return null;
  return path.join(config.openclaw.home, 'agent-profiles.json');
}

type ClawboardConfigFile = {
  agents?: {
    include?: unknown;
  };
  includeAgents?: unknown;
};

function resolveClawboardConfigPath(): string {
  const raw = process.env.CLAWBOARD_CONFIG_PATH;
  if (raw) return raw.startsWith('/') ? raw : path.resolve(BACKEND_ROOT, raw);
  return path.join(getClawboardDir(), 'config.json');
}

function readClawboardConfigFile(filePath: string): ClawboardConfigFile {
  if (!fs.existsSync(filePath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as ClawboardConfigFile;
  } catch (err) {
    console.warn(`[config] Failed to parse config file ${filePath}:`, err);
    return {};
  }
}

function parseAgentIncludeListFromEnv(): AgentIncludeList {
  const raw = process.env.CLAWBOARD_AGENTS_INCLUDE ?? process.env.CLAWBOARD_INCLUDE_AGENTS;
  if (raw == null) return null;
  const parsed = normalizeAgentIds(String(raw).split(','));
  // Empty env should be treated as "no restriction", not "show none".
  return parsed.length ? parsed : null;
}

function parseAgentIncludeListFromConfigFile(cfg: ClawboardConfigFile): AgentIncludeList {
  const candidate = cfg?.agents?.include ?? cfg?.includeAgents;
  if (candidate === undefined) return null;
  if (!Array.isArray(candidate)) return null;
  // Explicit empty array in config is allowed and means "show none".
  return normalizeAgentIds(candidate.filter((v): v is string => typeof v === 'string'));
}

function resolveAgentIncludeList(): AgentIncludeList {
  const fromEnv = parseAgentIncludeListFromEnv();
  if (fromEnv !== null) return fromEnv;

  const cfg = readClawboardConfigFile(resolveClawboardConfigPath());
  return parseAgentIncludeListFromConfigFile(cfg);
}

function isAgentIncluded(agentId: string, includeList: AgentIncludeList): boolean {
  if (agentId === '*') return true;
  if (includeList == null) return true;
  return includeList.includes(normalizeAgentId(agentId));
}

// Default projects directory: ~/.clawboard/projects
function resolveProjectsDir(): string {
  const raw = process.env.CLAWBOARD_PROJECTS_DIR;
  if (raw) {
    return raw.startsWith('/') ? raw : path.resolve(BACKEND_ROOT, raw);
  }
  return path.join(os.homedir(), '.clawboard', 'projects');
}

// Clawboard data directory
function getClawboardDir(): string {
  return path.join(os.homedir(), '.clawboard');
}

// Ensure clawboard directory exists
function ensureClawboardDir(): string {
  const dir = getClawboardDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// API key: generate if not provided, store in ~/.clawboard/api-key
function resolveApiKey(): string {
  // 1. Use env var if set
  if (process.env.CLAWBOARD_API_KEY) {
    return process.env.CLAWBOARD_API_KEY;
  }

  // 2. Check file
  const keyFile = path.join(getClawboardDir(), 'api-key');
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile, 'utf8').trim();
  }

  // 3. Generate new key
  const newKey = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(keyFile, newKey, { mode: 0o600 });
  console.log(`[config] Generated new API key, saved to ${keyFile}`);
  return newKey;
}

// Lazy-init OpenClaw detection (run once at startup)
let _openclaw: ReturnType<typeof detectOpenClaw> | null = null;
let _agentProfiles: AgentProfileMap | null = null;
let _pluginAgentProfiles: AgentProfileMap | null = null;
let _includedAgents: AgentIncludeList | undefined;

export function resetConfigCacheForTests() {
  _openclaw = null;
  _agentProfiles = null;
  _pluginAgentProfiles = null;
  _includedAgents = undefined;
}

export const config = {
  get dbPath(): string {
    return resolveDbPath();
  },
  dbSchema: path.join(DB_DIR, 'schema.sql'),
  dbMigrate: path.join(DB_DIR, 'migrate.js'),

  get projectsDir(): string {
    return resolveProjectsDir();
  },

  get apiKey(): string {
    return resolveApiKey();
  },

  get clawboardDir(): string {
    return ensureClawboardDir();
  },

  get openclaw(): ReturnType<typeof detectOpenClaw> {
    if (!_openclaw) {
      _openclaw = detectOpenClaw();
    }
    return _openclaw;
  },

  get agentProfiles(): AgentProfileMap {
    if (_agentProfiles == null) {
      _agentProfiles = readAgentProfileFile(resolveClawboardAgentProfilesPath());
    }
    return _agentProfiles;
  },

  get pluginAgentProfiles(): AgentProfileMap {
    if (_pluginAgentProfiles == null) {
      _pluginAgentProfiles = readAgentProfileFile(resolvePluginAgentProfilesPath());
    }
    return _pluginAgentProfiles;
  },

  get includedAgents(): AgentIncludeList {
    if (_includedAgents === undefined) {
      _includedAgents = resolveAgentIncludeList();
    }
    return _includedAgents;
  },

  isAgentIncluded(agentId: string): boolean {
    return isAgentIncluded(agentId, config.includedAgents);
  },
};
