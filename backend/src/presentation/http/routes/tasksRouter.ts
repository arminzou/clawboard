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
    const { status, assigned_to, include_archived, project_id, context_key, context_type } = req.query as Record<string, string | undefined>;

    try {
      const tasks = service.list({
        status: status as TaskStatus | undefined,
        assigned_to,
        include_archived: include_archived === '1' || include_archived === 'true',
        project_id: project_id != null ? Number(project_id) : undefined,
        context_key,
        context_type,
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
