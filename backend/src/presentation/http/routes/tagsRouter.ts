import type { Database } from 'better-sqlite3';
import { Router } from 'express';
import { TagRepository } from '../../../repositories/tagRepository';

export function createTagsRouter({ db }: { db: Database }) {
  const router = Router();
  const repo = new TagRepository(db);

  // GET /api/tags
  router.get('/', (_req, res) => {
    const tags = repo.list();
    res.json(tags);
  });

  return router;
}
