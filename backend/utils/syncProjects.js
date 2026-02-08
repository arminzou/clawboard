const fs = require('fs');
const path = require('path');

/**
 * Discover projects in the workspace and sync with the database.
 * Returns { discovered: number }
 */
function syncProjects(db, broadcast = null) {
  // Relative to workspace root (go up from backend/utils/ to workspace-tee/)
  // __dirname is: workspace-tee/projects/clawboard/backend/utils
  // We need: workspace-tee/
  const PROJECTS_DIR = path.resolve(__dirname, '../../../../');
  const projectsPath = path.join(PROJECTS_DIR, 'projects');

  if (!fs.existsSync(projectsPath)) {
    return { discovered: 0 };
  }

  // Read existing projects from DB
  const existing = db.prepare('SELECT slug FROM projects').all();
  const existingSlugs = new Set(existing.map((p) => p.slug));

  const entries = fs.readdirSync(projectsPath, { withFileTypes: true });
  const dirs = entries.filter((e) => {
    return (
      e.isDirectory() &&
      !e.name.startsWith('.') &&
      // Smart discovery: ignore worktrees (folders with a .git file)
      !(
        fs.existsSync(path.join(projectsPath, e.name, '.git')) &&
        fs.lstatSync(path.join(projectsPath, e.name, '.git')).isFile()
      )
    );
  });

  const insertStmt = db.prepare(`
    INSERT INTO projects (name, slug, path, description, icon, color)
    VALUES (?, ?, ?, ?, 'folder', '#6366f1')
  `);

  let discovered = 0;
  for (const dir of dirs) {
    const slug = dir.name;
    if (existingSlugs.has(slug)) continue;

    const dirPath = `projects/${slug}`;
    const name = slug
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Check for README to get description
    let description = '';
    const readmePath = path.join(projectsPath, slug, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const content = fs.readFileSync(readmePath, 'utf8');
        const firstLine = content.split('\n').find((l) => l.trim() && !l.startsWith('#'));
        if (firstLine) description = firstLine.trim().slice(0, 200);
      } catch {
        // ignore
      }
    }

    insertStmt.run(name, slug, dirPath, description);
    discovered++;
  }

  // Notify clients if new projects were discovered
  if (discovered > 0 && broadcast) {
    console.log(`[syncProjects] Broadcasting projects_updated (discovered: ${discovered})`);
    broadcast({ type: 'projects_updated', data: { discovered } });
  }

  return { discovered };
}

module.exports = { syncProjects };
