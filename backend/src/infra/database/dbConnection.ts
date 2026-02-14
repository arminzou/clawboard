import Database from 'better-sqlite3';
import path from 'path';

export function createDatabase(dbPath: string = path.join(__dirname, '../../../data/clawboard.db')): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Better performance for concurrent reads/writes

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
