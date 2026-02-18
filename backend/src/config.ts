import path from 'path';
import os from 'os';

// Resolve backend root from package.json location
const BACKEND_ROOT = path.dirname(require.resolve('../package.json'));

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
