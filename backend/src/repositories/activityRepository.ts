import type { Database } from 'better-sqlite3';
import type { Activity, Agent } from '../domain/activity';

export interface ListActivitiesParams {
  agent?: Agent;
  limit?: number;
  offset?: number;
  since?: string;
  related_task_id?: number;
  project_id?: number;
  date_from?: string;
  date_to?: string;
}

export interface CreateActivityBody {
  agent: Agent;
  activity_type: string;
  description: string;
  details?: string | null;
  session_key?: string | null;
  related_task_id?: number | null;
}

export interface ActivityStats {
  total: number;
  by_agent: Array<{ agent: string; count: number }>;
  by_type: Array<{ activity_type: string; count: number }>;
  recent_24h: number;
}

export class ActivityRepository {
  constructor(public readonly db: Database) {}

  list(params: ListActivitiesParams = {}): Activity[] {
    const { agent, limit = 50, offset = 0, since, related_task_id, project_id, date_from, date_to } = params;

    let query = 'SELECT activities.* FROM activities LEFT JOIN tasks ON tasks.id = activities.related_task_id';
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (agent) {
      conditions.push('agent = ?');
      values.push(agent);
    }
    if (since) {
      conditions.push('datetime(activities.timestamp) >= datetime(?)');
      values.push(since);
    }
    if (related_task_id != null) {
      conditions.push('activities.related_task_id = ?');
      values.push(related_task_id);
    }
    if (project_id != null) {
      conditions.push('tasks.project_id = ?');
      values.push(project_id);
    }
    if (date_from) {
      conditions.push('datetime(activities.timestamp) >= datetime(?)');
      values.push(date_from);
    }
    if (date_to) {
      conditions.push('datetime(activities.timestamp) <= datetime(?)');
      values.push(date_to);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    query += ' ORDER BY activities.timestamp DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    return this.db.prepare(query).all(...values) as Activity[];
  }

  listByAgent(agent: Agent, limit: number = 50): Activity[] {
    return this.db
      .prepare(
        `
        SELECT * FROM activities 
        WHERE agent = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `,
      )
      .all(agent, limit) as Activity[];
  }

  create(body: CreateActivityBody): Activity {
    const result = this.db
      .prepare(
        `
        INSERT INTO activities (agent, activity_type, description, details, session_key, related_task_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        body.agent,
        body.activity_type,
        body.description,
        body.details ?? null,
        body.session_key ?? null,
        body.related_task_id ?? null,
      );

    const created = this.db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid) as Activity;
    return created;
  }

  getStats(): ActivityStats {
    return {
      total: (this.db.prepare('SELECT COUNT(*) as count FROM activities').get() as { count: number }).count,
      by_agent: this.db
        .prepare(
          `
        SELECT agent, COUNT(*) as count 
        FROM activities 
        GROUP BY agent
      `,
        )
        .all() as any,
      by_type: this.db
        .prepare(
          `
        SELECT activity_type, COUNT(*) as count 
        FROM activities 
        GROUP BY activity_type
        ORDER BY count DESC
        LIMIT 10
      `,
        )
        .all() as any,
      recent_24h: (
        this.db
          .prepare(
            `
        SELECT COUNT(*) as count 
        FROM activities 
        WHERE timestamp >= datetime('now', '-24 hours')
      `,
          )
          .get() as { count: number }
      ).count,
    };
  }
}
