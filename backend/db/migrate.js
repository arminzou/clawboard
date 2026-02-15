const fs = require('fs');
const path = require('path');

function migrate(db) {
  // Very small migration system using PRAGMA user_version.
  // 0 -> 1: add activities.source_id + unique index
  const v = db.pragma('user_version', { simple: true });
  if (v < 1) {
    const hasSourceId = db
      .prepare("SELECT 1 FROM pragma_table_info('activities') WHERE name='source_id'")
      .get();

    if (!hasSourceId) {
      db.exec("ALTER TABLE activities ADD COLUMN source_id TEXT");
    }

    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_source_id ON activities(source_id)');

    db.pragma('user_version = 1');
  }

  // 1 -> 2: add tasks.archived_at + index
  if (v < 2) {
    const hasArchivedAt = db
      .prepare("SELECT 1 FROM pragma_table_info('tasks') WHERE name='archived_at'")
      .get();

    if (!hasArchivedAt) {
      db.exec('ALTER TABLE tasks ADD COLUMN archived_at DATETIME');
    }

    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at)');

    db.pragma('user_version = 2');
  }

  // 2 -> 3: add tasks.due_date
  if (v < 3) {
    const hasDueDate = db
      .prepare("SELECT 1 FROM pragma_table_info('tasks') WHERE name='due_date'")
      .get();

    if (!hasDueDate) {
      db.exec('ALTER TABLE tasks ADD COLUMN due_date TEXT');
    }

    db.pragma('user_version = 3');
  }


  // 3 -> 4: add tasks.tags (JSON array string)
  if (v < 4) {
    const hasTags = db
      .prepare("SELECT 1 FROM pragma_table_info('tasks') WHERE name='tags'")
      .get();

    if (!hasTags) {
      db.exec('ALTER TABLE tasks ADD COLUMN tags TEXT');
    }

    db.pragma('user_version = 4');
  }

  // 4 -> 5: add tasks.blocked_reason
  if (v < 5) {
    const hasBlockedReason = db
      .prepare("SELECT 1 FROM pragma_table_info('tasks') WHERE name='blocked_reason'")
      .get();

    if (!hasBlockedReason) {
      db.exec('ALTER TABLE tasks ADD COLUMN blocked_reason TEXT');
    }

    db.pragma('user_version = 5');
  }

  // 5 -> 6: add tasks.context_key and tasks.context_type for worktree/branch support
  if (v < 6) {
    const hasContextKey = db
      .prepare("SELECT 1 FROM pragma_table_info('tasks') WHERE name='context_key'")
      .get();
    if (!hasContextKey) {
      db.exec('ALTER TABLE tasks ADD COLUMN context_key TEXT');
    }

    const hasContextType = db
      .prepare("SELECT 1 FROM pragma_table_info('tasks') WHERE name='context_type'")
      .get();
    if (!hasContextType) {
      db.exec('ALTER TABLE tasks ADD COLUMN context_type TEXT');
    }

    db.pragma('user_version = 6');
  }

  // 6 -> 7: add tags table
  if (v < 7) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const rows = db.prepare('SELECT tags FROM tasks WHERE tags IS NOT NULL').all();
    const insert = db.prepare('INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING');
    const insertMany = db.transaction((names) => {
      for (const name of names) insert.run(name);
    });

    const names = [];
    for (const row of rows) {
      const raw = row.tags;
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            for (const t of parsed) {
              const s = String(t).trim();
              if (s) names.push(s);
            }
          }
        } catch {
          // ignore parse errors
        }
      } else {
        for (const t of trimmed.split(',')) {
          const s = t.trim();
          if (s) names.push(s);
        }
      }
    }

    if (names.length) insertMany(names);

    db.pragma('user_version = 7');
  }

  // Keep schema.sql aligned for fresh init
}

module.exports = { migrate };
