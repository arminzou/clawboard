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

  get openclaw(): ReturnType<typeof detectOpenClaw> {
    if (!_openclaw) {
      _openclaw = detectOpenClaw();
    }
    return _openclaw;
  },
};
