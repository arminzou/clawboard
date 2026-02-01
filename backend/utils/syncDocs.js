const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { getGitStatusMap } = require('./gitStatus');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '../../..');
const DB_PATH = path.join(__dirname, '../../data/tasks.db');

function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === '.openclaw') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, fileList);
    else fileList.push(full);
  }
  return fileList;
}

function fileType(p) {
  const ext = path.extname(p);
  return ext ? ext.slice(1).toLowerCase() : 'unknown';
}

function main() {
  const db = new Database(DB_PATH);
  const gitStatus = getGitStatusMap(WORKSPACE_ROOT);

  const files = walk(WORKSPACE_ROOT);

  const upsert = db.prepare(`
    INSERT INTO documents (file_path, file_type, last_modified, last_modified_by, size_bytes, git_status)
    VALUES (@file_path, @file_type, @last_modified, @last_modified_by, @size_bytes, @git_status)
    ON CONFLICT(file_path) DO UPDATE SET
      file_type=excluded.file_type,
      last_modified=excluded.last_modified,
      last_modified_by=excluded.last_modified_by,
      size_bytes=excluded.size_bytes,
      git_status=excluded.git_status
  `);

  const tx = db.transaction(() => {
    for (const abs of files) {
      const rel = path.relative(WORKSPACE_ROOT, abs);
      const stat = fs.statSync(abs);
      const status = gitStatus.get(rel) || 'clean';
      upsert.run({
        file_path: rel,
        file_type: fileType(rel),
        last_modified: new Date(stat.mtimeMs).toISOString(),
        last_modified_by: null,
        size_bytes: stat.size,
        git_status: status,
      });
    }
  });

  tx();
  db.close();
  console.log(`✓ Synced ${files.length} documents from ${WORKSPACE_ROOT}`);
}

if (require.main === module) main();
