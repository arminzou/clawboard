import path from 'path';
import fs from 'fs';
import os from 'os';

// Resolve backend root from package.json location
// In production (dist/), go up two levels. In dev (src/), go up one.
function resolveBackendRoot(): string {
  const configDir = path.dirname(__filename);
  const possiblePaths = [
    path.join(configDir, '../package.json'),      // dev: backend/src/ -> backend/
    path.join(configDir, '../../package.json'),   // prod: backend/dist/src/ -> backend/
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return path.dirname(p);
    }
  }

  // Fallback: assume we're in backend/ (common dev setup)
  return path.join(configDir, '..');
}

const BACKEND_ROOT = resolveBackendRoot();

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

export const config = {
  get dbPath(): string {
    return resolveDbPath();
  },
  dbSchema: path.join(DB_DIR, 'schema.sql'),
  dbMigrate: path.join(DB_DIR, 'migrate.js'),
};
