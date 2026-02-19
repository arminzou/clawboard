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
};
