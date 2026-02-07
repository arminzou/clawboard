const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Workspace projects directory (relative to backend)
const PROJECTS_DIR = path.resolve(__dirname, '../../../');

/**
 * GET /api/projects
 * List all projects from the database.
 */
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY name ASC').all();
    res.json(projects);
  } catch (err) {
    console.error('Failed to list projects:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

/**
 * GET /api/projects/:id
 * Get a single project by ID.
 */
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    console.error('Failed to get project:', err);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

/**
 * POST /api/projects/discover
 * Scan the workspace projects directory and sync with database.
 * Creates new projects for directories not yet tracked.
 */
router.post('/discover', (req, res) => {
  const db = req.app.locals.db;

  try {
    // Read existing projects from DB
    const existing = db.prepare('SELECT slug, path FROM projects').all();
    const existingSlugs = new Set(existing.map((p) => p.slug));

    // Scan projects directory
    const projectsPath = path.join(PROJECTS_DIR, 'projects');
    if (!fs.existsSync(projectsPath)) {
      return res.json({ discovered: 0, total: existing.length, message: 'Projects directory not found' });
    }

    const entries = fs.readdirSync(projectsPath, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

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

    const total = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    res.json({ discovered, total });
  } catch (err) {
    console.error('Project discovery failed:', err);
    res.status(500).json({ error: 'Project discovery failed' });
  }
});

/**
 * PATCH /api/projects/:id
 * Update project metadata (name, description, icon, color).
 */
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { name, description, icon, color } = req.body;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      values.push(icon);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }

    if (updates.length === 0) {
      return res.json(project);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Failed to update project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

module.exports = router;
