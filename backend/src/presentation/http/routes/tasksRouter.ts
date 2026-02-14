import express, { type Request, type Response } from 'express';
import type { Database } from 'better-sqlite3';
import { TaskRepository } from '../../../repositories/taskRepository';
import { TaskService } from '../../../services/taskService';
import type { TaskStatus } from '../../../domain/task';

export type BroadcastFn = (data: unknown) => void;

export function createTasksRouter({ db, broadcast }: { db: Database; broadcast?: BroadcastFn }) {
  const router = express.Router();

  const repo = new TaskRepository(db);
  const service = new TaskService(repo);

  function sendError(res: Response, err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg === 'Title is required' || msg === 'No fields to update' || msg === 'Invalid status') {
      return res.status(400).json({ error: msg });
    }

    if (msg === 'Task not found') {
      return res.status(404).json({ error: msg });
    }

    return res.status(500).json({ error: msg });
  }

  // GET /api/tasks
  router.get('/', (req: Request, res: Response) => {
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
      sendError(res, err);
    }
  });

  // GET /api/tasks/:id
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const task = service.getById(id);
      res.json(task);
    } catch (err) {
      sendError(res, err);
    }
  });

  // POST /api/tasks
  router.post('/', (req: Request, res: Response) => {
    try {
      const task = service.create(req.body);
      broadcast?.({ type: 'task_created', data: task });
      res.status(201).json(task);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Title is required') return res.status(400).json({ error: msg });
      sendError(res, err);
    }
  });

  // PATCH /api/tasks/:id
  router.patch('/:id', (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const task = service.update(id, req.body);
      broadcast?.({ type: 'task_updated', data: task });
      res.json(task);
    } catch (err) {
      sendError(res, err);
    }
  });

  // DELETE /api/tasks/:id
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      service.delete(id);
      broadcast?.({ type: 'task_deleted', data: { id } });
      res.status(204).send();
    } catch (err) {
      sendError(res, err);
    }
  });

  return router;
}
