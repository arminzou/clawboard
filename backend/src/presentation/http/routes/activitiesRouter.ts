import express, { type NextFunction, type Request, type Response } from 'express';
import type { Database } from 'better-sqlite3';
import { ActivityRepository } from '../../../repositories/activityRepository';
import { ActivityService } from '../../../services/activityService';
import type { Agent } from '../../../domain/activity';
import { HttpError } from '../errors/httpError';

export type BroadcastFn = (data: unknown) => void;

export function createActivitiesRouter({ db, broadcast }: { db: Database; broadcast?: BroadcastFn }) {
  const router = express.Router();

  const repo = new ActivityRepository(db);
  const service = new ActivityService(repo);

  // GET /api/activities
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agent, limit, offset, since, task_id, project_id, date_from, date_to } = req.query as Record<string, string | undefined>;
      const parsedTaskId = task_id != null ? Number(task_id) : undefined;
      if (task_id != null && !Number.isFinite(parsedTaskId)) {
        throw new HttpError(400, 'Invalid task_id');
      }
      const parsedProjectId = project_id != null ? Number(project_id) : undefined;
      if (project_id != null && !Number.isFinite(parsedProjectId)) {
        throw new HttpError(400, 'Invalid project_id');
      }

      const activities = service.list({
        agent: agent as Agent | undefined,
        limit: limit != null ? parseInt(limit, 10) : undefined,
        offset: offset != null ? parseInt(offset, 10) : undefined,
        since,
        related_task_id: parsedTaskId,
        project_id: parsedProjectId,
        date_from,
        date_to,
      });
      res.json(activities);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/activities
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const activity = service.create(req.body);
      broadcast?.({ type: 'activity_created', data: activity });
      res.status(201).json(activity);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/activities/agent/:agent
  router.get('/agent/:agent', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit } = req.query as Record<string, string | undefined>;
      const activities = service.listByAgent(
        req.params.agent as Agent,
        limit != null ? parseInt(limit, 10) : undefined,
      );
      res.json(activities);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/activities/ingest-sessions
  router.post('/ingest-sessions', (req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = Array.isArray(req.body?.agents) ? req.body.agents : undefined;
      const result = service.ingestSessions(agents);
      broadcast?.({ type: 'activity_ingested', data: result });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/activities/stats
  router.get('/stats', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(service.getStats());
    } catch (err) {
      next(err);
    }
  });

  return router;
}
