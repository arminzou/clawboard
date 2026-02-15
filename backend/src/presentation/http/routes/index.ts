import type { Express } from 'express';
import type { Database } from 'better-sqlite3';
import { createTasksRouter } from './tasksRouter';
import { createProjectsRouter } from './projectsRouter';
import { createActivitiesRouter } from './activitiesRouter';
import { createTagsRouter } from './tagsRouter';
import { errorHandler } from '../middleware/errorHandler';

export type BroadcastFn = (data: unknown) => void;

export function registerRoutes(app: Express, db: Database, broadcast: BroadcastFn): void {
  // New TypeScript routes
  app.use('/api/tasks', createTasksRouter({ db, broadcast }));
  app.use('/api/projects', createProjectsRouter({ db }));
  app.use('/api/activities', createActivitiesRouter({ db, broadcast }));
  app.use('/api/tags', createTagsRouter({ db }));

  // Legacy CommonJS routes (to be migrated)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tasksArchiveRouter = require('../../../../routes/tasks.archive');
  app.use('/api/tasks', tasksArchiveRouter);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const docsRouter = require('../../../../routes/docs');
  app.use('/api/docs', docsRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Centralized error handling (must be last)
  app.use(errorHandler);
}
