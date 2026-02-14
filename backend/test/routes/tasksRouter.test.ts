import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';

describe('Tasks API', () => {
  let db: any;

  beforeEach(() => {
    process.env.CLAWBOARD_API_KEY = '';
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('creates, updates, lists, and deletes tasks', async () => {
    const broadcast = vi.fn();
    const appCtx = createTestApp({ broadcast });
    db = appCtx.db;

    const create = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'Test Task', status: 'backlog' })
      .expect(201);

    expect(create.body.title).toBe('Test Task');
    expect(broadcast).toHaveBeenCalledWith({ type: 'task_created', data: create.body });

    const list = await request(appCtx.app).get('/api/tasks').expect(200);
    expect(list.body).toHaveLength(1);

    const update = await request(appCtx.app)
      .patch(`/api/tasks/${create.body.id}`)
      .send({ status: 'in_progress' })
      .expect(200);
    expect(update.body.status).toBe('in_progress');
    expect(broadcast).toHaveBeenCalledWith({ type: 'task_updated', data: update.body });

    await request(appCtx.app).delete(`/api/tasks/${create.body.id}`).expect(204);
    expect(broadcast).toHaveBeenCalledWith({ type: 'task_deleted', data: { id: create.body.id } });

    const after = await request(appCtx.app).get('/api/tasks').expect(200);
    expect(after.body).toHaveLength(0);
  });

  it('filters by status and supports archive_done', async () => {
    const broadcast = vi.fn();
    const appCtx = createTestApp({ broadcast });
    db = appCtx.db;

    const taskA = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'A', status: 'done' })
      .expect(201);
    await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'B', status: 'backlog' })
      .expect(201);

    const done = await request(appCtx.app).get('/api/tasks?status=done').expect(200);
    expect(done.body).toHaveLength(1);

    await request(appCtx.app)
      .post('/api/tasks/archive_done')
      .send({ assigned_to: 'all' })
      .expect(200);

    const includeArchived = await request(appCtx.app).get('/api/tasks?include_archived=1').expect(200);
    const archived = includeArchived.body.find((t: any) => t.id === taskA.body.id);
    expect(archived.archived_at).toBeTruthy();

    expect(broadcast).toHaveBeenCalledWith({ type: 'tasks_bulk_updated', data: { archived_done: 1 } });
  });

  it('returns 400 for invalid id', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    await request(appCtx.app).get('/api/tasks/not-a-number').expect(400);
  });
});
