import type { Database } from 'better-sqlite3';
import { Router } from 'express';
import { ThreadRepository } from '../../../repositories/threadRepository';
import { ThreadService } from '../../../services/threadService';

export function createHumansRouter({ db }: { db: Database }) {
  const router = Router();
  const service = new ThreadService(new ThreadRepository(db));

  router.get('/:humanId/attention', (req, res) => {
    const attention = service.listHumanAttention(req.params.humanId);
    res.json(attention);
  });

  return router;
}
