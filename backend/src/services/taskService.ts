import type { Task, TaskStatus } from '../domain/task';
import type { CreateTaskBody, ListTasksParams, TaskRepository, UpdateTaskBody, ReorderTaskInput } from '../repositories/taskRepository';
import { HttpError } from '../presentation/http/errors/httpError';

export class TaskService {
  constructor(private readonly repo: TaskRepository) {}

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

  reorder(updates: ReorderTaskInput[]): { updated: number } {
    if (!Array.isArray(updates) || updates.length === 0) throw new HttpError(400, 'No reorder updates');

    const allowed: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done'];
    const normalized = updates.map((item) => {
      if (!item || typeof item !== 'object') throw new HttpError(400, 'Invalid reorder payload');
      const id = Number((item as ReorderTaskInput).id);
      const status = (item as ReorderTaskInput).status as TaskStatus;
      const position = (item as ReorderTaskInput).position;

      if (!Number.isFinite(id)) throw new HttpError(400, 'Invalid task id');
      if (!allowed.includes(status)) throw new HttpError(400, 'Invalid status');
      if (position !== null && !Number.isFinite(Number(position))) throw new HttpError(400, 'Invalid position');

      return { id, status, position: position === null ? null : Number(position) };
    });

    try {
      return this.repo.reorder(normalized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Task not found') throw new HttpError(404, 'Task not found');
      throw err;
    }
  }

  delete(id: number): void {
    const { changes } = this.repo.delete(id);
    if (changes === 0) throw new HttpError(404, 'Task not found');
  }
}
