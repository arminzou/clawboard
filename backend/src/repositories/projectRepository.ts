import type { Database } from 'better-sqlite3';
import type { Project } from '../domain/project';

export interface ProjectStats {
  project_id: number;
  project_name: string;
  tasks: {
    total: number;
    by_status: Array<{ status: string; count: number }>;
    by_priority: Array<{ priority: string | null; count: number }>;
    by_assignee: Array<{ assigned_to: string | null; count: number }>;
    overdue: number;
    completed_last_7d: number;
  };
}

export interface SummaryStats {
  projects: {
    total: number;
  };
  tasks: {
    total: number;
    by_status: Array<{ status: string; count: number }>;
    by_project: Array<{ project_name: string; project_id: number; count: number }>;
    overdue: number;
  };
}

export class ProjectRepository {
  constructor(public readonly db: Database) {}

  list(): Project[] {
    return this.db.prepare('SELECT * FROM projects ORDER BY name ASC').all() as Project[];
  }

  getById(id: number): Project | null {
    return (this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project) ?? null;
  }

  update(id: number, patch: Partial<Pick<Project, 'name' | 'description' | 'icon' | 'color'>>): Project {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (patch.name !== undefined) {
      updates.push('name = ?');
      values.push(patch.name);
    }
    if (patch.description !== undefined) {
      updates.push('description = ?');
      values.push(patch.description);
    }
    if (patch.icon !== undefined) {
      updates.push('icon = ?');
      values.push(patch.icon);
    }
    if (patch.color !== undefined) {
      updates.push('color = ?');
      values.push(patch.color);
    }

    if (updates.length === 0) {
      const existing = this.getById(id);
      if (!existing) throw new Error('Project not found');
      return existing;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    this.db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = this.getById(id);
    if (!updated) throw new Error('Project not found');
    return updated;
  }

  delete(id: number, cleanupTasks: boolean): void {
    this.db.transaction(() => {
      if (cleanupTasks) {
        this.db.prepare('DELETE FROM tasks WHERE project_id = ?').run(id);
      } else {
        this.db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(id);
      }

      const result = this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
      if (result.changes === 0) throw new Error('Project not found');
    })();
  }

  assignUnassignedTasks(id: number): { updated: number } {
    const result = this.db.prepare('UPDATE tasks SET project_id = ? WHERE project_id IS NULL').run(id);
    return { updated: result.changes };
  }

  getProjectStats(id: number): ProjectStats {
    const project = this.getById(id);
    if (!project) throw new Error('Project not found');

    return {
      project_id: project.id,
      project_name: project.name,
      tasks: {
        total: (this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND archived_at IS NULL').get(id) as { count: number }).count,
        by_status: this.db.prepare(`
          SELECT status, COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND archived_at IS NULL
          GROUP BY status
        `).all(id) as any,
        by_priority: this.db.prepare(`
          SELECT priority, COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND archived_at IS NULL
          GROUP BY priority
        `).all(id) as any,
        by_assignee: this.db.prepare(`
          SELECT assigned_to, COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND archived_at IS NULL
          GROUP BY assigned_to
        `).all(id) as any,
        overdue: (this.db.prepare(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND archived_at IS NULL AND status != 'done'
            AND due_date IS NOT NULL AND due_date < date('now')
        `).get(id) as { count: number }).count,
        completed_last_7d: (this.db.prepare(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE project_id = ? AND status = 'done'
            AND completed_at >= datetime('now', '-7 days')
        `).get(id) as { count: number }).count,
      },
    };
  }

  getSummaryStats(): SummaryStats {
    return {
      projects: {
        total: (this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count,
      },
      tasks: {
        total: (this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE archived_at IS NULL').get() as { count: number }).count,
        by_status: this.db.prepare(`
          SELECT status, COUNT(*) as count 
          FROM tasks 
          WHERE archived_at IS NULL
          GROUP BY status
        `).all() as any,
        by_project: this.db.prepare(`
          SELECT p.name as project_name, p.id as project_id, COUNT(t.id) as count 
          FROM projects p
          LEFT JOIN tasks t ON t.project_id = p.id AND t.archived_at IS NULL
          GROUP BY p.id
          ORDER BY count DESC
        `).all() as any,
        overdue: (this.db.prepare(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE archived_at IS NULL AND status != 'done'
            AND due_date IS NOT NULL AND due_date < date('now')
        `).get() as { count: number }).count,
      },
    };
  }
}
