const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Workspace projects directory (relative to backend)
const PROJECTS_DIR = path.resolve(__dirname, '../../../../');

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
  const { syncProjects } = require('../utils/syncProjects');

  try {
    const { discovered } = syncProjects(db);
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

/**
 * DELETE /api/projects/:id
 * Remove a project and optionally cleanup its tasks.
 * query param: cleanupTasks=true
 */
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const cleanupTasks = req.query.cleanupTasks === 'true';

  try {
    db.transaction(() => {
      if (cleanupTasks) {
        // Option A: Delete related tasks entirely
        db.prepare('DELETE FROM tasks WHERE project_id = ?').run(id);
      } else {
        // Option B: Unlink tasks (set project_id to NULL) so they remain in "All Projects"
        db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(id);
      }

      // Delete the project entry
      const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        throw new Error('Project not found');
      }
    })();

    res.json({ success: true, message: cleanupTasks ? 'Project and tasks deleted' : 'Project removed, tasks unlinked' });
  } catch (err) {
    console.error('Failed to delete project:', err);
    res.status(err.message === 'Project not found' ? 404 : 500).json({ error: err.message });
  }
});

/**
 * GET /api/projects/:id/stats
 * Get task statistics for a specific project.
 */
router.get('/:id/stats', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const stats = {
      project_id: parseInt(id, 10),
      project_name: project.name,
      tasks: {
        total: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND archived_at IS NULL').get(id).count,
        by_status: db.prepare(`
          SELECT status, COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND archived_at IS NULL
          GROUP BY status
        `).all(id),
        by_priority: db.prepare(`
          SELECT priority, COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND archived_at IS NULL
          GROUP BY priority
        `).all(id),
        by_assignee: db.prepare(`
          SELECT assigned_to, COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND archived_at IS NULL
          GROUP BY assigned_to
        `).all(id),
        overdue: db.prepare(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND archived_at IS NULL AND status != 'done'
            AND due_date IS NOT NULL AND due_date < date('now')
        `).get(id).count,
        completed_last_7d: db.prepare(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND status = 'done'
            AND completed_at >= datetime('now', '-7 days')
        `).get(id).count,
      },
    };

    res.json(stats);
  } catch (err) {
    console.error('Failed to get project stats:', err);
    res.status(500).json({ error: 'Failed to get project stats' });
  }
});

/**
 * GET /api/projects/stats/summary
 * Get aggregated stats across all projects.
 */
router.get('/stats/summary', (req, res) => {
  const db = req.app.locals.db;

  try {
    const stats = {
      projects: {
        total: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
      },
      tasks: {
        total: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE archived_at IS NULL').get().count,
        by_status: db.prepare(`
          SELECT status, COUNT(*) as count 
          FROM tasks 
          WHERE archived_at IS NULL
          GROUP BY status
        `).all(),
        by_project: db.prepare(`
          SELECT p.name as project_name, p.id as project_id, COUNT(t.id) as count 
          FROM projects p
          LEFT JOIN tasks t ON t.project_id = p.id AND t.archived_at IS NULL
          GROUP BY p.id
          ORDER BY count DESC
        `).all(),
        overdue: db.prepare(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE archived_at IS NULL AND status != 'done'
            AND due_date IS NOT NULL AND due_date < date('now')
        `).get().count,
      },
    };

    res.json(stats);
  } catch (err) {
    console.error('Failed to get summary stats:', err);
    res.status(500).json({ error: 'Failed to get summary stats' });
  }
});

/**
 * GET /api/projects/:id/context
 * Get current git context (branch/worktree) for the project.
 */
router.get('/:id/context', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { getGitContext } = require('../utils/gitContext');

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.path) {
      return res.json({ key: null, type: null });
    }

    const absPath = path.resolve(PROJECTS_DIR, project.path);
    const context = getGitContext(absPath);
    res.json(context);
  } catch (err) {
    console.error('Failed to get project context:', err);
    res.status(500).json({ error: 'Failed to get project context' });
  }
});

module.exports = router;
