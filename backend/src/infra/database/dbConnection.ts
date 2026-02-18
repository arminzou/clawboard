import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../../config';

function ensureSchema(db: Database.Database) {
  const hasTasks = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='tasks'")
    .get();

  if (!hasTasks) {
    if (!fs.existsSync(config.dbSchema)) {
      throw new Error(`Schema not found at ${config.dbSchema}`);
    }
    const schema = fs.readFileSync(config.dbSchema, 'utf8');
    db.exec(schema);
  }
}

export function createDatabase(dbPath: string = config.dbPath): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Better performance for concurrent reads/writes

  // Ensure base schema exists before migrations
  ensureSchema(db);

  // Run migrations
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { migrate } = require(config.dbMigrate);
    migrate(db);
  } catch (e) {
    console.error('Migration failed:', e);
    throw e;
  }

  return db;
}
