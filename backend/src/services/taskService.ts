import type { Task, TaskStatus } from '../domain/task';
import type { CreateTaskBody, ListTasksParams, TaskRepository, UpdateTaskBody } from '../repositories/taskRepository';
import { HttpError } from '../presentation/http/errors/httpError';

export class TaskService {
  constructor(private readonly repo: TaskRepository) {}

  private normalizeBulkIds(ids: number[]): number[] {
    if (!Array.isArray(ids) || ids.length === 0) throw new HttpError(400, 'No task ids provided');
    const uniqueIds = Array.from(new Set(ids.map((raw) => Number(raw))));
    if (uniqueIds.some((id) => !Number.isFinite(id))) throw new HttpError(400, 'Invalid task id');
    return uniqueIds;
  }

  list(params: ListTasksParams = {}): Task[] {
    return this.repo.list(params);
  }

  getById(id: number): Task {
    const task = this.repo.getById(id);
    if (!task) throw new HttpError(404, 'Task not found');
    return task;
  }

  create(body: CreateTaskBody): Task {
    if (!body.title || !body.title.trim()) throw new HttpError(400, 'Title is required');
    return this.repo.create({ ...body, title: body.title.trim() });
  }

  update(id: number, patch: UpdateTaskBody): Task {
    if (!patch || Object.keys(patch).length === 0) throw new HttpError(400, 'No fields to update');

    // Normalize common string fields.
    const normalized: UpdateTaskBody = { ...patch };
    if (typeof normalized.title === 'string') normalized.title = normalized.title.trim();
    if (typeof normalized.due_date === 'string') normalized.due_date = normalized.due_date.trim();

    // Enforce status domain.
    if (normalized.status) {
      const allowed: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done'];
      if (!allowed.includes(normalized.status)) throw new HttpError(400, 'Invalid status');
    }

    try {
      return this.repo.update(id, normalized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Task not found') throw new HttpError(404, 'Task not found');
      if (msg === 'No fields to update') throw new HttpError(400, 'No fields to update');
      throw err;
    }
  }

  bulkAssignProject(ids: number[], projectId: number | null): { updated: number } {
    const uniqueIds = this.normalizeBulkIds(ids);

    let normalizedProjectId: number | null = null;
    if (projectId !== null) {
      const n = Number(projectId);
      if (!Number.isFinite(n)) throw new HttpError(400, 'Invalid project id');
      normalizedProjectId = n;
    }

    return this.repo.bulkAssignProject({
      ids: uniqueIds,
      project_id: normalizedProjectId,
    });
  }

  bulkAssignAssignee(ids: number[], assigneeRaw: unknown): { updated: number } {
    const uniqueIds = this.normalizeBulkIds(ids);
    const allowed: Array<Task['assigned_to']> = ['tee', 'fay', 'armin', null];
    const assignee = assigneeRaw as Task['assigned_to'];
    if (!allowed.includes(assignee)) throw new HttpError(400, 'Invalid assignee');

    return this.repo.bulkAssignAssignee({
      ids: uniqueIds,
      assigned_to: assignee,
    });
  }

  bulkUpdateStatus(ids: number[], statusRaw: unknown): { updated: number } {
    const uniqueIds = this.normalizeBulkIds(ids);
    const allowed: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done'];
    const status = statusRaw as TaskStatus;
    if (!allowed.includes(status)) throw new HttpError(400, 'Invalid status');

    return this.repo.bulkUpdateStatus({
      ids: uniqueIds,
      status,
    });
  }

  bulkDelete(ids: number[]): { deleted: number } {
    const uniqueIds = this.normalizeBulkIds(ids);
    return this.repo.bulkDelete(uniqueIds);
  }

  delete(id: number): void {
    const { changes } = this.repo.delete(id);
    if (changes === 0) throw new HttpError(404, 'Task not found');
  }
}
