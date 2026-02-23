import express, { type NextFunction, type Request, type Response } from 'express';
import type { Database } from 'better-sqlite3';
import { TaskRepository } from '../../../repositories/taskRepository';
import { TaskService } from '../../../services/taskService';
import type { TaskStatus } from '../../../domain/task';
import { HttpError } from '../errors/httpError';

export type BroadcastFn = (data: unknown) => void;

export function createTasksRouter({ db, broadcast }: { db: Database; broadcast?: BroadcastFn }) {
  const router = express.Router();

  const repo = new TaskRepository(db);
  const service = new TaskService(repo);

  function parseId(raw: unknown): number {
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (typeof s !== 'string') throw new HttpError(400, 'Invalid id');

    const id = Number(s);
    if (!Number.isFinite(id)) throw new HttpError(400, 'Invalid id');
    return id;
  }

  // GET /api/tasks
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    const { status, assigned_to, include_archived, project_id, context_key, context_type, is_someday } = req.query as Record<string, string | undefined>;

    try {
      const tasks = service.list({
        status: status as TaskStatus | undefined,
        assigned_to,
        include_archived: include_archived === '1' || include_archived === 'true',
        project_id: project_id != null ? Number(project_id) : undefined,
        context_key,
        context_type,
        is_someday: is_someday === '1' || is_someday === 'true' ? true : is_someday === '0' || is_someday === 'false' ? false : undefined,
      });
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/tasks/:id
  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      const task = service.getById(id);
      res.json(task);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tasks
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = service.create(req.body);
      broadcast?.({ type: 'task_created', data: task });
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tasks/bulk/project
  router.post('/bulk/project', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = (req.body ?? {}) as { ids?: unknown; project_id?: unknown };
      const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)) : [];
      const projectId = body.project_id === undefined || body.project_id === null ? null : Number(body.project_id);
      const result = service.bulkAssignProject(ids, projectId);
      broadcast?.({ type: 'tasks_bulk_updated', data: { project_assigned: result.updated, project_id: projectId } });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tasks/bulk/assignee
  router.post('/bulk/assignee', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = (req.body ?? {}) as { ids?: unknown; assigned_to?: unknown };
      const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)) : [];
      const assignee = body.assigned_to;
      const result = service.bulkAssignAssignee(ids, assignee);
      broadcast?.({ type: 'tasks_bulk_updated', data: { assignee_assigned: result.updated, assigned_to: assignee } });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tasks/bulk/status
  router.post('/bulk/status', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = (req.body ?? {}) as { ids?: unknown; status?: unknown };
      const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)) : [];
      const status = body.status;
      const result = service.bulkUpdateStatus(ids, status);
      broadcast?.({ type: 'tasks_bulk_updated', data: { status_updated: result.updated, status } });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tasks/bulk/delete
  router.post('/bulk/delete', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = (req.body ?? {}) as { ids?: unknown };
      const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)) : [];
      const result = service.bulkDelete(ids);
      broadcast?.({ type: 'tasks_bulk_updated', data: { deleted: result.deleted } });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/tasks/:id
  router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      const task = service.update(id, req.body);
      broadcast?.({ type: 'task_updated', data: task });
      res.json(task);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/tasks/:id
  router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      service.delete(id);
      broadcast?.({ type: 'task_deleted', data: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
