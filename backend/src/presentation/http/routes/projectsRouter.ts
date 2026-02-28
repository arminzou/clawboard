import express, { type NextFunction, type Request, type Response } from 'express';
import type { Database } from 'better-sqlite3';
import { ProjectRepository } from '../../../repositories/projectRepository';
import { ProjectService } from '../../../services/projectService';
import { HttpError } from '../errors/httpError';

export function createProjectsRouter({ db, broadcast }: { db: Database; broadcast?: (data: unknown) => void }) {
  const router = express.Router();

  const repo = new ProjectRepository(db);
  const service = new ProjectService(repo, broadcast);

  function parseId(raw: unknown): number {
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (typeof s !== 'string') throw new HttpError(400, 'Invalid id');
    const id = Number(s);
    if (!Number.isFinite(id)) throw new HttpError(400, 'Invalid id');
    return id;
  }

  // GET /api/projects
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(service.list());
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/stats/summary
  router.get('/stats/summary', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(service.getSummaryStats());
    } catch (err) {
      next(err);
    }
  });

  // POST /api/projects
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = service.createManual(req.body ?? {});
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id
  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      res.json(service.getById(id));
    } catch (err) {
      next(err);
    }
  });

  // POST /api/projects/discover
  router.post('/discover', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(service.discover());
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/projects/:id
  router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      res.json(service.update(id, req.body));
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/projects/:id
  router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      const cleanupTasks = req.query.cleanupTasks === 'true';
      service.delete(id, cleanupTasks);
      res.json({
        success: true,
        message: cleanupTasks ? 'Project and tasks deleted' : 'Project removed, tasks unlinked',
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/projects/:id/assign-unassigned
  router.post('/:id/assign-unassigned', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      res.json(service.assignUnassignedTasks(id));
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id/stats
  router.get('/:id/stats', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      res.json(service.getStats(id));
    } catch (err) {
      next(err);
    }
  });

  // GET /api/projects/:id/context
  router.get('/:id/context', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      res.json(service.getGitContext(id));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
