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

  // Keep schema.sql aligned for fresh init
}

module.exports = { migrate };
