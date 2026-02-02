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
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  position: number;
}

export interface Activity {
  id: number;
  agent: 'tee' | 'fay';
  activity_type: string;
  description: string;
  details: string | null;
  session_key: string | null;
  timestamp: string;
  related_task_id: number | null;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3001';
const API_BASE_CLEAN = API_BASE.replace(/\/$/, '');

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async health() {
    return json<{ status: string; timestamp: string }>(await fetch(`${API_BASE_CLEAN}/api/health`));
  },

  async listTasks(params?: { status?: TaskStatus; assigned_to?: string }) {
    const usp = new URLSearchParams();
    if (params?.status) usp.set('status', params.status);
    if (params?.assigned_to) usp.set('assigned_to', params.assigned_to);
    const url = `${API_BASE_CLEAN}/api/tasks${usp.toString() ? `?${usp.toString()}` : ''}`;
    return json<Task[]>(await fetch(url));
  },

  async createTask(body: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assigned_to' | 'position'>> & { title: string }) {
    return json<Task>(
      await fetch(`${API_BASE_CLEAN}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  },

  async updateTask(id: number, body: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assigned_to' | 'position'>>) {
    return json<Task>(
      await fetch(`${API_BASE_CLEAN}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  },

  async deleteTask(id: number) {
    const res = await fetch(`${API_BASE_CLEAN}/api/tasks/${id}`, { method: 'DELETE' });
    if (!(res.status === 204 || res.ok)) throw new Error(`${res.status} ${res.statusText}`);
  },

  async listActivities(params?: { agent?: string; limit?: number }) {
    const usp = new URLSearchParams();
    if (params?.agent) usp.set('agent', params.agent);
    if (params?.limit != null) usp.set('limit', String(params.limit));
    const url = `${API_BASE_CLEAN}/api/activities${usp.toString() ? `?${usp.toString()}` : ''}`;
    return json<Activity[]>(await fetch(url));
  },
};
