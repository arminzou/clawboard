import type { Database } from 'better-sqlite3';
import { Router } from 'express';
import { ThreadRepository } from '../../../repositories/threadRepository';
import { ThreadService } from '../../../services/threadService';

export function createThreadsRouter({ db }: { db: Database }) {
  const router = Router();
  const service = new ThreadService(new ThreadRepository(db));

  router.post('/', (req, res) => {
    const thread = service.create(req.body ?? {});
    res.status(201).json(thread);
  });

  router.get('/', (req, res) => {
    const threads = service.list({
      status: req.query.status as string | undefined,
      owner_human_id: req.query.owner as string | undefined,
      myAttention: String(req.query.myAttention ?? '').toLowerCase() === 'true',
    });
    res.json(threads);
  });

  router.get('/:threadId', (req, res) => {
    const thread = service.getById(req.params.threadId);
    res.json(thread);
  });

  router.patch('/:threadId', (req, res) => {
    const thread = service.update(req.params.threadId, req.body ?? {});
    res.json(thread);
  });

  router.post('/:threadId/transition', (req, res) => {
    const thread = service.transition(req.params.threadId, req.body ?? {});
    res.json(thread);
  });

  router.post('/:threadId/clone', (req, res) => {
    const cloned = service.clone(req.params.threadId, req.body ?? {});
    res.status(201).json(cloned);
  });

  router.get('/:threadId/events', (req, res) => {
    const events = service.listEvents(req.params.threadId, req.query as any);
    res.json(events);
  });

  router.post('/:threadId/events', (req, res) => {
    const event = service.createEvent(req.params.threadId, req.body ?? {});
    res.status(201).json(event);
  });

  router.get('/:threadId/promotion-packet', (req, res) => {
    const packet = service.getPromotionPacket(req.params.threadId);
    if (!packet) {
      res.status(404).json({ error: 'Promotion packet not found' });
      return;
    }
    res.json(packet);
  });

  router.put('/:threadId/promotion-packet', (req, res) => {
    const packet = service.putPromotionPacket(req.params.threadId, req.body ?? {});
    res.json(packet);
  });

  router.post('/:threadId/promotion-packet/validate', (req, res) => {
    const validation = service.validatePromotionPacket(req.params.threadId);
    res.json(validation);
  });

  router.post('/:threadId/promote', (req, res) => {
    const result = service.promote(req.params.threadId, req.body ?? {});
    res.json(result);
  });

  return router;
}
