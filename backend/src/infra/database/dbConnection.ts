import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function ensureSchema(db: Database.Database) {
  const hasTasks = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='tasks'")
    .get();

  if (!hasTasks) {
    const schemaPath = path.join(__dirname, '../../../../db/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema not found at ${schemaPath}`);
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }
}

export function createDatabase(dbPath: string = path.join(__dirname, '../../../data/clawboard.db')): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Better performance for concurrent reads/writes

  // Ensure base schema exists before migrations
  ensureSchema(db);

  // Run migrations
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { migrate } = require('../../../db/migrate');
    migrate(db);
  } catch (e) {
    console.error('Migration failed:', e);
    throw e;
  }

  return db;
}
