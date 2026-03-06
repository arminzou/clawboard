export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | null;
export type AssigneeType = 'agent' | 'human' | null;
export type AnchorSource = 'task' | 'project' | 'category' | 'scratch' | null;

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to_type: AssigneeType;
  assigned_to_id: string | null;
  non_agent: boolean;
  anchor: string | null;
  due_date: string | null;
  tags: string[];
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
  project_id: number | null;
  context_key: string | null;
  context_type: string | null;
  is_someday: boolean;
  blocked_by_task_ids: number[];
  blocks_task_ids: number[];
  is_dependency_blocked: boolean;
  resolved_anchor: string | null;
  anchor_source: AnchorSource;
}

export interface Activity {
  id: number;
  agent: string;
  activity_type: string;
  description: string;
  details: string | null;
  session_key: string | null;
  timestamp: string;
  related_task_id: number | null;
}

export interface AgentSettingsProfile {
  id: string;
  display_name: string;
  avatar: string;
  description: string;
  source: 'config' | 'plugin' | 'generated';
}

export interface OpenClawStatus {
  detected: boolean;
  home: string | null;
  agents: string[];
  discoveredAgents?: string[];
  includedAgents?: string[] | null;
  pluginAgentProfiles?: Record<string, {
    displayName?: string;
    avatar?: string;
    accent?: string;
    borderColor?: string;
    insetShadow?: string;
    idleQuotes?: string[];
    persona?: 'methodical' | 'playful' | 'pragmatic';
  }>;
  agentProfiles?: Record<string, {
    displayName?: string;
    avatar?: string;
    accent?: string;
    borderColor?: string;
    insetShadow?: string;
    idleQuotes?: string[];
    persona?: 'methodical' | 'playful' | 'pragmatic';
  }>;
  projectsDir: string | null;
}

export interface Document {
  id: number;
  file_path: string;
  file_type: string | null;
  doc_type_tag: string | null;
  last_modified: string | null;
  last_modified_by: string | null;
  last_accessed_at: string | null;
  size_bytes: number | null;
  git_status: string | null;
  linked_tasks?: Array<{ id: number; title: string; status: string }>;
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
    by_assignee: Array<{ assigned_to_id: string | null; count: number }>;
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
  by_doc_type_tag?: Array<{ doc_type_tag: string | null; count: number }>;
  by_status: Array<{ git_status: string | null; count: number }>;
  by_author: Array<{ last_modified_by: string; count: number }>;
}

export interface ClaudeNativeTask {
  id: string;
  title: string;
  status: string;
  updated_at: string | null;
  dependencies: string[];
  source_file: string;
  mapped_task_id: number | null;
  mapped_task_title: string | null;
  mapped_task_status: string | null;
}

export interface ClaudeTaskWorkspace {
  workspace_id: string;
  path: string;
  updated_at: string | null;
  highwatermark: number | null;
}

export interface ClaudeTasksResponse {
  base_dir: string;
  workspaces: ClaudeTaskWorkspace[];
  tasks: ClaudeNativeTask[];
}

// Thread-first v1.0 (feature-flagged on backend)
export type ThreadStatus = 'open' | 'clarifying' | 'ready_to_plan' | 'pending_approval' | 'promoted' | 'archived';
export type ThreadPriority = 'low' | 'medium' | 'high';
export type ThreadActorType = 'human' | 'agent' | 'system';
export type ThreadEventType =
  | 'question_opened'
  | 'clarification_requested'
  | 'clarification_provided'
  | 'work_log'
  | 'proposal_posted'
  | 'objection_posted'
  | 'decision_requested'
  | 'decision_recorded'
  | 'promoted_to_task'
  | 'thread_cloned'
  | 'archived';
export type ThreadStance = 'agree' | 'object' | 'needs_info';

export interface MentionPayload {
  what_changed: string;
  what_you_need_from_human: string;
  options: string[];
  recommended_option?: string;
  deadline_or_urgency?: string;
}

export interface QuestionThread {
  id: string;
  workspace_id: string;
  title: string;
  problem_statement: string;
  status: ThreadStatus;
  priority: ThreadPriority;
  owner_human_id: string;
  created_by_type: Exclude<ThreadActorType, 'system'>;
  created_by_id: string;
  current_state_summary: string | null;
  consensus_state: 'aligned' | 'mixed' | 'blocked';
  open_disagreements_count: number;
  decision_deadline: string | null;
  last_human_ping_at: string | null;
  cloned_from_thread_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadEvent {
  id: string;
  thread_id: string;
  event_type: ThreadEventType;
  actor_type: ThreadActorType;
  actor_id: string;
  body_md: string | null;
  stance: ThreadStance | null;
  mention_human: boolean;
  mention_payload: MentionPayload | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PromotionPacket {
  id: string;
  thread_id: string;
  problem: string | null;
  desired_outcome: string | null;
  scope_in: string | null;
  scope_out: string | null;
  constraints: string | null;
  decision_owner_id: string | null;
  acceptance_criteria: string[];
  first_executable_slice: string | null;
  dependencies: unknown;
  risks: unknown;
  context_links: unknown;
  is_complete: boolean;
  validated_at: string | null;
  updated_by_type: ThreadActorType;
  updated_by_id: string;
  created_at: string;
  updated_at: string;
}

export type HumanAttentionBuckets = {
  needs_decision: QuestionThread[];
  needs_clarification: QuestionThread[];
  needs_approval: QuestionThread[];
  blocked_on_human: QuestionThread[];
};

const API_BASE = ((import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE) ?? '';
const API_BASE_CLEAN = API_BASE ? API_BASE.replace(/\/$/, '') : '';

const API_KEY = ((import.meta as unknown as { env?: { VITE_PAWVY_API_KEY?: string } }).env?.VITE_PAWVY_API_KEY) ?? '';

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
    assigned_to_type?: AssigneeType;
    assigned_to_id?: string | null;
    non_agent?: boolean;
    include_archived?: boolean; 
    project_id?: number;
    context_key?: string;
    context_type?: string;
    is_someday?: boolean;
  }) {
    const usp = new URLSearchParams();
    if (params?.status) usp.set('status', params.status);
    if (params?.assigned_to_type) usp.set('assigned_to_type', params.assigned_to_type);
    if (params?.assigned_to_id !== undefined) usp.set('assigned_to_id', params.assigned_to_id ?? '');
    if (params?.non_agent !== undefined) usp.set('non_agent', params.non_agent ? '1' : '0');
    if (params?.include_archived) usp.set('include_archived', '1');
    if (params?.project_id) usp.set('project_id', String(params.project_id));
    if (params?.context_key) usp.set('context_key', params.context_key);
    if (params?.context_type) usp.set('context_type', params.context_type);
    if (params?.is_someday !== undefined) usp.set('is_someday', params.is_someday ? '1' : '0');
    const url = `${withBase('/api/tasks')}${usp.toString() ? `?${usp.toString()}` : ''}`;
    return json<Task[]>(await fetch(url, { headers: authHeaders() }));
  },

  async archiveDone(body?: { assigned_to_type?: AssigneeType | null; assigned_to_id?: string | null }) {
    return json<{ archived: number }>(
      await fetch(withBase('/api/tasks/archive_done'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body ?? {}),
      }),
    );
  },

  async createTask(
    body: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'tags' | 'blocked_reason' | 'assigned_to_type' | 'assigned_to_id' | 'non_agent' | 'anchor' | 'project_id' | 'context_key' | 'context_type' | 'is_someday' | 'blocked_by_task_ids'>> & { title: string },
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
    body: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'tags' | 'blocked_reason' | 'assigned_to_type' | 'assigned_to_id' | 'non_agent' | 'anchor' | 'archived_at' | 'context_key' | 'context_type' | 'project_id' | 'is_someday' | 'blocked_by_task_ids'>>,
  ) {
    return json<Task>(
      await fetch(withBase(`/api/tasks/${id}`), {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async bulkAssignProject(ids: number[], projectId: number | null) {
    return json<{ updated: number }>(
      await fetch(withBase('/api/tasks/bulk/project'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ids, project_id: projectId }),
      }),
    );
  },

  async bulkAssignAssignee(ids: number[], assigned_to_type: AssigneeType, assigned_to_id: string | null) {
    return json<{ updated: number }>(
      await fetch(withBase('/api/tasks/bulk/assignee'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ids, assigned_to_type, assigned_to_id }),
      }),
    );
  },

  async bulkUpdateStatus(ids: number[], status: TaskStatus) {
    return json<{ updated: number }>(
      await fetch(withBase('/api/tasks/bulk/status'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ids, status }),
      }),
    );
  },

  async bulkDeleteTasks(ids: number[]) {
    return json<{ deleted: number }>(
      await fetch(withBase('/api/tasks/bulk/delete'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ids }),
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
      assigned_to_type: task.assigned_to_type ?? undefined,
      assigned_to_id: task.assigned_to_id ?? undefined,
      non_agent: task.non_agent,
      anchor: task.anchor ?? undefined,
      project_id: task.project_id ?? undefined,
      context_key: task.context_key ?? undefined,
      context_type: task.context_type ?? undefined,
      is_someday: task.is_someday,
      blocked_by_task_ids: task.blocked_by_task_ids,
    });
  },

  async listTags() {
    return json<string[]>(await fetch(withBase('/api/tags'), { headers: authHeaders() }));
  },

  async listActivities(params?: {
    agent?: string;
    limit?: number;
    offset?: number;
    since?: string;
    task_id?: number;
    project_id?: number;
    date_from?: string;
    date_to?: string;
  }) {
    const usp = new URLSearchParams();
    if (params?.agent) usp.set('agent', params.agent);
    if (params?.since) usp.set('since', params.since);
    if (params?.task_id != null) usp.set('task_id', String(params.task_id));
    if (params?.project_id != null) usp.set('project_id', String(params.project_id));
    if (params?.date_from) usp.set('date_from', params.date_from);
    if (params?.date_to) usp.set('date_to', params.date_to);
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

  async listDocs(params?: { git_status?: string; doc_type_tag?: string; limit?: number }) {
    const usp = new URLSearchParams();
    if (params?.git_status) usp.set('git_status', params.git_status);
    if (params?.doc_type_tag) usp.set('doc_type_tag', params.doc_type_tag);
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

  async markDocAccessed(id: number) {
    return json<Document>(
      await fetch(withBase(`/api/docs/${id}/accessed`), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
      }),
    );
  },

  async updateDoc(id: number, body: { doc_type_tag?: string | null }) {
    return json<Document>(
      await fetch(withBase(`/api/docs/${id}`), {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async attachDocToTask(id: number, taskId: number) {
    return json<Document>(
      await fetch(withBase(`/api/docs/${id}/attach-task`), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ task_id: taskId }),
      }),
    );
  },

  async listProjects() {
    return json<Project[]>(await fetch(withBase('/api/projects'), { headers: authHeaders() }));
  },

  async createProject(body: { name: string; path: string; description?: string }) {
    return json<Project>(
      await fetch(withBase('/api/projects'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async discoverProjects() {
    return json<{ discovered: number; total: number }>(
      await fetch(withBase('/api/projects/discover'), {
        method: 'POST',
        headers: authHeaders(),
      }),
    );
  },

  async assignUnassignedTasks(projectId: number) {
    return json<{ updated: number }>(
      await fetch(withBase(`/api/projects/${projectId}/assign-unassigned`), {
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

  async getOpenClawStatus() {
    return json<OpenClawStatus>(await fetch(withBase('/api/openclaw/status'), { headers: authHeaders() }));
  },

  async listAgentSettings() {
    return json<{ agents: AgentSettingsProfile[] }>(
      await fetch(withBase('/api/settings/agents'), { headers: authHeaders() }),
    );
  },

  async updateAgentSetting(agentId: string, body: { display_name?: string | null; avatar?: string | null; description?: string | null }) {
    return json<AgentSettingsProfile>(
      await fetch(withBase(`/api/settings/agents/${encodeURIComponent(agentId)}`), {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  // --- Thread-first v1.0 (feature-flagged on backend)
  async getHumanAttention(humanId: string) {
    return json<HumanAttentionBuckets>(
      await fetch(withBase(`/api/humans/${encodeURIComponent(humanId)}/attention`), { headers: authHeaders() }),
    );
  },

  async listThreads(params?: { status?: ThreadStatus; owner?: string; myAttention?: boolean }) {
    const usp = new URLSearchParams();
    if (params?.status) usp.set('status', params.status);
    if (params?.owner) usp.set('owner', params.owner);
    if (params?.myAttention !== undefined) usp.set('myAttention', params.myAttention ? 'true' : 'false');
    const url = `${withBase('/api/threads')}${usp.toString() ? `?${usp.toString()}` : ''}`;
    return json<QuestionThread[]>(await fetch(url, { headers: authHeaders() }));
  },

  async getThread(threadId: string) {
    return json<QuestionThread>(await fetch(withBase(`/api/threads/${encodeURIComponent(threadId)}`), { headers: authHeaders() }));
  },

  async listThreadEvents(threadId: string) {
    return json<ThreadEvent[]>(
      await fetch(withBase(`/api/threads/${encodeURIComponent(threadId)}/events`), { headers: authHeaders() }),
    );
  },

  async getPromotionPacket(threadId: string) {
    return json<PromotionPacket>(
      await fetch(withBase(`/api/threads/${encodeURIComponent(threadId)}/promotion-packet`), { headers: authHeaders() }),
    );
  },

  async transitionThread(threadId: string, body: { to: ThreadStatus; actor_type: ThreadActorType; actor_id: string; reason?: string }) {
    return json<QuestionThread>(
      await fetch(withBase(`/api/threads/${encodeURIComponent(threadId)}/transition`), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async cloneThread(threadId: string, body: { actor_type: ThreadActorType; actor_id: string; title?: string }) {
    return json<QuestionThread>(
      await fetch(withBase(`/api/threads/${encodeURIComponent(threadId)}/clone`), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async promoteThread(threadId: string, body: { actor_type: 'human'; actor_id: string; tasks: Array<{ title: string; description?: string; priority?: string }> }) {
    return json<{ thread: QuestionThread; created_task_ids: number[] }>(
      await fetch(withBase(`/api/threads/${encodeURIComponent(threadId)}/promote`), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async putPromotionPacket(threadId: string, body: Record<string, unknown>) {
    return json<PromotionPacket>(
      await fetch(withBase(`/api/threads/${encodeURIComponent(threadId)}/promotion-packet`), {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      }),
    );
  },

  async validatePromotionPacket(threadId: string) {
    return json<{ is_complete: boolean; missing_fields: string[] }>(
      await fetch(withBase(`/api/threads/${encodeURIComponent(threadId)}/promotion-packet/validate`), {
        method: 'POST',
        headers: authHeaders(),
      }),
    );
  },

  async listClaudeTasks() {
    return json<ClaudeTasksResponse>(await fetch(withBase('/api/claude/tasks'), { headers: authHeaders() }));
  },
};
