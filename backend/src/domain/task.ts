export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | null;
export type Assignee = 'tee' | 'fay' | 'armin' | null;

/**
 * Canonical Task shape returned by the API.
 * Matches the `tasks` table, except `tags` is hydrated to `string[]`.
 */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  tags: string[];
  blocked_reason: string | null;
  assigned_to: Assignee;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  position: number;
  archived_at: string | null;
  project_id: number | null;
  context_key: string | null;
  context_type: string | null;
  is_someday: boolean;
}

/**
 * Raw DB row shape (as returned by better-sqlite3). `tags` is stored as JSON string.
 */
export interface TaskRow extends Omit<Task, 'tags' | 'is_someday'> {
  tags: string | null;
  is_someday: number; // SQLite stores boolean as 0/1
}
