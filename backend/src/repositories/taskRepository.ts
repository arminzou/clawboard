import type { Database } from 'better-sqlite3';
import type { Task, TaskRow, TaskStatus } from '../domain/task';

function normalizeTags(input: unknown): string[] {
  if (input === undefined) return [];
  if (input === null) return [];

  if (Array.isArray(input)) {
    return input.map(String).map((t) => t.trim()).filter(Boolean);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];

    // Accept JSON array string.
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) return parsed.map(String).map((t) => t.trim()).filter(Boolean);
      } catch {
        // fall through
      }
    }

    // Accept comma-separated.
    return trimmed
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return [];
}

function hydrateTask(row: TaskRow): Task {
  return {
    ...row,
    description: row.description ?? null,
    due_date: row.due_date ?? null,
    blocked_reason: row.blocked_reason ?? null,
    assigned_to: (row.assigned_to ?? null) as Task['assigned_to'],
    completed_at: row.completed_at ?? null,
    archived_at: row.archived_at ?? null,
    project_id: row.project_id ?? null,
    context_key: row.context_key ?? null,
    context_type: row.context_type ?? null,
    tags: normalizeTags(row.tags),
  };
}

export type ListTasksParams = {
  status?: TaskStatus;
  assigned_to?: string;
  include_archived?: boolean;
  project_id?: number;
  context_key?: string;
  context_type?: string;
};

export type CreateTaskBody = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Task['priority'];
  due_date?: string | null;
  tags?: string[] | string;
  blocked_reason?: string | null;
  assigned_to?: Task['assigned_to'];
  position?: number | null;
  project_id?: number | null;
  context_key?: string | null;
  context_type?: string | null;
};

export type UpdateTaskBody = Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'status'
    | 'priority'
    | 'due_date'
    | 'assigned_to'
    | 'position'
    | 'archived_at'
    | 'blocked_reason'
    | 'project_id'
    | 'context_key'
    | 'context_type'
  >
> & {
  tags?: string[] | string | null;
};

export class TaskRepository {
  constructor(private readonly db: Database) {}

  private ensureTags(tags: string[]) {
    if (!tags.length) return;
    const insert = this.db.prepare('INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING');
    const insertMany = this.db.transaction((names: string[]) => {
      for (const name of names) insert.run(name);
    });
    insertMany(tags);
  }

  list(params: ListTasksParams = {}): Task[] {
    const {
      status,
      assigned_to,
      include_archived,
      project_id,
      context_key,
      context_type,
    } = params;

    let query = 'SELECT * FROM tasks';
    const conditions: string[] = [];
    const values: unknown[] = [];

    const includeArchived = include_archived === true;
    if (!includeArchived) conditions.push('archived_at IS NULL');

    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }
    if (assigned_to) {
      conditions.push('assigned_to = ?');
      values.push(assigned_to);
    }
    if (project_id != null) {
      conditions.push('project_id = ?');
      values.push(project_id);
    }
    if (context_key) {
      conditions.push('context_key = ?');
      values.push(context_key);
    }
    if (context_type) {
      conditions.push('context_type = ?');
      values.push(context_type);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    query += ' ORDER BY position ASC, created_at DESC';

    const rows = this.db.prepare(query).all(...values) as TaskRow[];
    return rows.map(hydrateTask);
  }

  getById(id: number): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row ? hydrateTask(row) : null;
  }

  create(body: CreateTaskBody): Task {
    const title = body.title;
    const description = body.description ?? null;
    const status = body.status ?? 'backlog';
    const priority = body.priority ?? null;
    const due_date = typeof body.due_date === 'string' && body.due_date.trim() ? body.due_date.trim() : null;
    const normalizedTags = body.tags === undefined ? undefined : normalizeTags(body.tags);
    const tagsJson = normalizedTags === undefined ? null : JSON.stringify(normalizedTags);
    if (normalizedTags) this.ensureTags(normalizedTags);
    const blocked_reason = typeof body.blocked_reason === 'string' && body.blocked_reason.trim() ? body.blocked_reason.trim() : null;
    const assigned_to = body.assigned_to ?? null;
    const project_id = body.project_id != null ? Number(body.project_id) : null;
    const context_key = typeof body.context_key === 'string' && body.context_key.trim() ? body.context_key.trim() : null;
    const context_type = typeof body.context_type === 'string' && body.context_type.trim() ? body.context_type.trim() : null;

    // If no explicit position, append to end of column for stable ordering.
    const resolvedPosition =
      body.position !== undefined && body.position !== null
        ? body.position
        : (this.db
            .prepare('SELECT COALESCE(MAX(position), -1) + 1 as next FROM tasks WHERE status = ? AND archived_at IS NULL')
            .get(status) as { next: number }).next;

    const completedAt = status === 'done' ? new Date().toISOString() : null;

    const result = this.db
      .prepare(
        `
        INSERT INTO tasks (
          title, description, status, priority, due_date,
          tags, blocked_reason, assigned_to, position, project_id,
          context_key, context_type, completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        title,
        description,
        status,
        priority,
        due_date,
        tagsJson,
        blocked_reason,
        assigned_to,
        resolvedPosition,
        project_id,
        context_key,
        context_type,
        completedAt,
      );

    const created = this.getById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create task');
    return created;
  }

  update(id: number, patch: UpdateTaskBody): Task {
    const updates: string[] = [];
    const values: unknown[] = [];
    const existing = this.getById(id);

    if (patch.title !== undefined) {
      updates.push('title = ?');
      values.push(patch.title);
    }
    if (patch.description !== undefined) {
      updates.push('description = ?');
      values.push(patch.description);
    }
    if (patch.status !== undefined) {
      updates.push('status = ?');
      values.push(patch.status);
      if (patch.status === 'done') {
        const existingCompleted = existing?.status === 'done' ? existing.completed_at : null;
        updates.push('completed_at = ?');
        values.push(existingCompleted ?? new Date().toISOString());
      } else {
        updates.push('completed_at = ?');
        values.push(null);
      }
    }
    if (patch.priority !== undefined) {
      updates.push('priority = ?');
      values.push(patch.priority);
    }
    if (patch.due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(typeof patch.due_date === 'string' && patch.due_date.trim() ? patch.due_date.trim() : null);
    }
    if (patch.tags !== undefined) {
      const normalized = normalizeTags(patch.tags);
      updates.push('tags = ?');
      values.push(JSON.stringify(normalized ?? []));
      this.ensureTags(normalized);
    }
    if (patch.blocked_reason !== undefined) {
      updates.push('blocked_reason = ?');
      values.push(typeof patch.blocked_reason === 'string' && patch.blocked_reason.trim() ? patch.blocked_reason.trim() : null);
    }
    if (patch.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(patch.assigned_to);
    }
    if (patch.position !== undefined) {
      updates.push('position = ?');
      values.push(patch.position);
    }
    if (patch.archived_at !== undefined) {
      updates.push('archived_at = ?');
      values.push(patch.archived_at);
    }
    if (patch.project_id !== undefined) {
      updates.push('project_id = ?');
      values.push(patch.project_id != null ? Number(patch.project_id) : null);
    }
    if (patch.context_key !== undefined) {
      updates.push('context_key = ?');
      values.push(typeof patch.context_key === 'string' && patch.context_key.trim() ? patch.context_key.trim() : null);
    }
    if (patch.context_type !== undefined) {
      updates.push('context_type = ?');
      values.push(typeof patch.context_type === 'string' && patch.context_type.trim() ? patch.context_type.trim() : null);
    }

    if (updates.length === 0) throw new Error('No fields to update');

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = this.getById(id);
    if (!updated) throw new Error('Task not found');
    return updated;
  }

  delete(id: number): { changes: number } {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id) as { changes: number };
    return { changes: result.changes };
  }
}
