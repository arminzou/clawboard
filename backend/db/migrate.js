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

  // Keep schema.sql aligned for fresh init
}

module.exports = { migrate };
