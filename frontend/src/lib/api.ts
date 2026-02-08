export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | null;
export type Assignee = 'tee' | 'fay' | 'armin' | null;

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: Assignee;
  due_date?: string | null;
  tags?: string[];
  blocked_reason?: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  position: number;
  archived_at?: string | null;
  project_id: number | null;
  context_key?: string | null;
  context_type?: string | null;
}

export interface Activity {
  id: number;
  agent: 'tee' | 'fay' | 'armin';
  activity_type: string;
  description: string;
  details: string | null;
  session_key: string | null;
  timestamp: string;
  related_task_id: number | null;
}

export interface Document {
  id: number;
  file_path: string;
  file_type: string | null;
  last_modified: string | null;
  last_modified_by: string | null;
  size_bytes: number | null;
  git_status: string | null;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  path: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

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

export interface DocsStats {
  total: number;
  by_type: Array<{ file_type: string | null; count: number }>;
  by_status: Array<{ git_status: string | null; count: number }>;
  by_author: Array<{ last_modified_by: string; count: number }>;
}

const API_BASE = ((import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE) ?? '';
const API_BASE_CLEAN = API_BASE ? API_BASE.replace(/\/$/, '') : '';

const API_KEY = ((import.meta as unknown as { env?: { VITE_CLAWBOARD_API_KEY?: string } }).env?.VITE_CLAWBOARD_API_KEY) ?? '';

function authHeaders(extra?: Record<string, string>) {
  const h: Record<string, string> = { ...(extra ?? {}) };
  if (API_KEY) h.Authorization = `Bearer ${API_KEY}`;
  return h;
}

function withBase(path: string) {
  return API_BASE_CLEAN ? `${API_BASE_CLEAN}${path}` : path;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async health() {
    return json<{ status: string; timestamp: string }>(await fetch(withBase('/api/health'), { headers: authHeaders() }));
  },

  async listTasks(params?: { 
    status?: TaskStatus; 
    assigned_to?: string; 
    include_archived?: boolean; 
    project_id?: number;
    context_key?: string;
    context_type?: string;
  }) {
    const usp = new URLSearchParams();
    if (params?.status) usp.set('status', params.status);
    if (params?.assigned_to) usp.set('assigned_to', params.assigned_to);
    if (params?.include_archived) usp.set('include_archived', '1');
    if (params?.project_id) usp.set('project_id', String(params.project_id));
    if (params?.context_key) usp.set('context_key', params.context_key);
    if (params?.context_type) usp.set('context_type', params.context_type);
    const url = `${withBase('/api/tasks')}${usp.toString() ? `?${usp.toString()}` : ''}`;
    return json<Task[]>(await fetch(url, { headers: authHeaders() }));
  },

  async archiveDone(body?: { assigned_to?: string | null }) {
    return json<{ archived: number }>(
      await fetch(withBase('/api/tasks/archive_done'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body ?? {}),
      }),
    );
  },

  async createTask(
    body: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'tags' | 'blocked_reason' | 'assigned_to' | 'position' | 'project_id' | 'context_key' | 'context_type'>> & { title: string },
  ) {
    return json<Task>(
      await fetch(withBase('/api/tasks'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async updateTask(
    id: number,
    body: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'tags' | 'blocked_reason' | 'assigned_to' | 'position' | 'archived_at' | 'context_key' | 'context_type'>>,
  ) {
    return json<Task>(
      await fetch(withBase(`/api/tasks/${id}`), {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async deleteTask(id: number) {
    const res = await fetch(withBase(`/api/tasks/${id}`), { method: 'DELETE', headers: authHeaders() });
    if (!(res.status === 204 || res.ok)) throw new Error(`${res.status} ${res.statusText}`);
  },

  /** Duplicate a task by creating a copy with "(copy)" appended to the title */
  async duplicateTask(task: Task) {
    return api.createTask({
      title: `${task.title} (copy)`,
      description: task.description ?? undefined,
      status: task.status,
      priority: task.priority ?? undefined,
      due_date: task.due_date ?? undefined,
      tags: task.tags,
      blocked_reason: task.blocked_reason ?? undefined,
      assigned_to: task.assigned_to,
      project_id: task.project_id ?? undefined,
      context_key: task.context_key ?? undefined,
      context_type: task.context_type ?? undefined,
    });
  },

  async listActivities(params?: { agent?: string; limit?: number; offset?: number; since?: string }) {
    const usp = new URLSearchParams();
    if (params?.agent) usp.set('agent', params.agent);
    if (params?.since) usp.set('since', params.since);
    if (params?.limit != null) usp.set('limit', String(params.limit));
    if (params?.offset != null) usp.set('offset', String(params.offset));
    const url = `${withBase('/api/activities')}${usp.toString() ? `?${usp.toString()}` : ''}`;
    return json<Activity[]>(await fetch(url, { headers: authHeaders() }));
  },

  async ingestSessions(body?: { agents?: string[] }) {
    return json<{ scanned: number; inserted: number; agents: string[] }>(
      await fetch(withBase('/api/activities/ingest-sessions'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body ?? {}),
      }),
    );
  },

  async listDocs(params?: { git_status?: string; limit?: number }) {
    const usp = new URLSearchParams();
    if (params?.git_status) usp.set('git_status', params.git_status);
    if (params?.limit != null) usp.set('limit', String(params.limit));
    const url = `${withBase('/api/docs')}${usp.toString() ? `?${usp.toString()}` : ''}`;
    return json<Document[]>(await fetch(url, { headers: authHeaders() }));
  },

  async docsStats() {
    return json<DocsStats>(await fetch(withBase('/api/docs/stats'), { headers: authHeaders() }));
  },

  async resyncDocs(body?: { workspace_root?: string }) {
    return json<{ files: number; workspaceRoot: string }>(
      await fetch(withBase('/api/docs/resync'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body ?? {}),
      }),
    );
  },

  async syncDoc(body: Partial<Pick<Document, 'file_type' | 'last_modified' | 'last_modified_by' | 'size_bytes' | 'git_status'>> & { file_path: string }) {
    return json<Document>(
      await fetch(withBase('/api/docs/sync'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async listProjects() {
    return json<Project[]>(await fetch(withBase('/api/projects'), { headers: authHeaders() }));
  },

  async discoverProjects() {
    return json<{ discovered: number; total: number }>(
      await fetch(withBase('/api/projects/discover'), {
        method: 'POST',
        headers: authHeaders(),
      }),
    );
  },

  async getProject(id: number) {
    return json<Project>(await fetch(withBase(`/api/projects/${id}`), { headers: authHeaders() }));
  },

  async updateProject(id: number, body: Partial<Pick<Project, 'name' | 'description' | 'icon' | 'color'>>) {
    return json<Project>(
      await fetch(withBase(`/api/projects/${id}`), {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async deleteProject(id: number, cleanupTasks = false) {
    return json<{ success: boolean; message: string }>(
      await fetch(withBase(`/api/projects/${id}?cleanupTasks=${cleanupTasks}`), {
        method: 'DELETE',
        headers: authHeaders(),
      }),
    );
  },

  async getProjectStats(id: number) {
    return json<ProjectStats>(await fetch(withBase(`/api/projects/${id}/stats`), { headers: authHeaders() }));
  },

  async getSummaryStats() {
    return json<SummaryStats>(await fetch(withBase('/api/projects/stats/summary'), { headers: authHeaders() }));
  },

  async getProjectContext(id: number) {
    return json<{ key: string | null; type: 'branch' | 'worktree' | null }>(
      await fetch(withBase(`/api/projects/${id}/context`), { headers: authHeaders() }),
    );
  },
};
