import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';

type TaskLike = {
  id: number;
  status: string;
  archived_at?: string | null;
  assigned_to?: string | null;
  project_id?: number | null;
  completed_at?: string | null;
};

type TestDb = ReturnType<typeof createTestApp>['db'];

describe('Tasks API', () => {
  let db: TestDb | null = null;

  beforeEach(() => {
    process.env.CLAWBOARD_API_KEY = '';
  });

  afterEach(() => {
    if (db) db.close();
    db = null;
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
    const archived = (includeArchived.body as TaskLike[]).find((t) => t.id === taskA.body.id);
    expect(archived).toBeDefined();
    expect(archived?.archived_at).toBeTruthy();

    expect(broadcast).toHaveBeenCalledWith({ type: 'tasks_bulk_updated', data: { archived_done: 1 } });
  });

  it('assigns project for multiple tasks in one request', async () => {
    const broadcast = vi.fn();
    const appCtx = createTestApp({ broadcast });
    db = appCtx.db;

    const project = appCtx.db
      .prepare('INSERT INTO projects (name, slug, path) VALUES (?, ?, ?)')
      .run('Clawboard', 'clawboard', '/tmp/clawboard');
    const projectId = Number(project.lastInsertRowid);

    const taskA = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'A', status: 'backlog' })
      .expect(201);
    const taskB = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'B', status: 'backlog' })
      .expect(201);

    const assign = await request(appCtx.app)
      .post('/api/tasks/bulk/project')
      .send({ ids: [taskA.body.id, taskB.body.id], project_id: projectId })
      .expect(200);

    expect(assign.body).toEqual({ updated: 2 });
    expect(broadcast).toHaveBeenCalledWith({
      type: 'tasks_bulk_updated',
      data: { project_assigned: 2, project_id: projectId },
    });

    const tasks = await request(appCtx.app).get('/api/tasks').expect(200);
    const mapped = new Map((tasks.body as TaskLike[]).map((t) => [t.id, t]));
    expect(mapped.get(taskA.body.id)?.project_id).toBe(projectId);
    expect(mapped.get(taskB.body.id)?.project_id).toBe(projectId);
  });

  it('returns 400 when bulk project payload has no ids', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    await request(appCtx.app)
      .post('/api/tasks/bulk/project')
      .send({ ids: [], project_id: null })
      .expect(400);
  });

  it('assigns assignee for multiple tasks in one request', async () => {
    const broadcast = vi.fn();
    const appCtx = createTestApp({ broadcast });
    db = appCtx.db;

    const taskA = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'A', status: 'backlog' })
      .expect(201);
    const taskB = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'B', status: 'backlog' })
      .expect(201);

    const assign = await request(appCtx.app)
      .post('/api/tasks/bulk/assignee')
      .send({ ids: [taskA.body.id, taskB.body.id], assigned_to: 'tee' })
      .expect(200);

    expect(assign.body).toEqual({ updated: 2 });
    expect(broadcast).toHaveBeenCalledWith({
      type: 'tasks_bulk_updated',
      data: { assignee_assigned: 2, assigned_to: 'tee' },
    });

    const tasks = await request(appCtx.app).get('/api/tasks').expect(200);
    const mapped = new Map((tasks.body as TaskLike[]).map((t) => [t.id, t]));
    expect(mapped.get(taskA.body.id)?.assigned_to).toBe('tee');
    expect(mapped.get(taskB.body.id)?.assigned_to).toBe('tee');
  });

  it('updates status for multiple tasks in one request', async () => {
    const broadcast = vi.fn();
    const appCtx = createTestApp({ broadcast });
    db = appCtx.db;

    const taskA = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'A', status: 'backlog' })
      .expect(201);
    const taskB = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'B', status: 'in_progress' })
      .expect(201);

    const update = await request(appCtx.app)
      .post('/api/tasks/bulk/status')
      .send({ ids: [taskA.body.id, taskB.body.id], status: 'done' })
      .expect(200);

    expect(update.body).toEqual({ updated: 2 });
    expect(broadcast).toHaveBeenCalledWith({
      type: 'tasks_bulk_updated',
      data: { status_updated: 2, status: 'done' },
    });

    const tasks = await request(appCtx.app).get('/api/tasks').expect(200);
    const mapped = new Map((tasks.body as TaskLike[]).map((t) => [t.id, t]));
    expect(mapped.get(taskA.body.id)?.status).toBe('done');
    expect(mapped.get(taskB.body.id)?.status).toBe('done');
    expect(mapped.get(taskA.body.id)?.completed_at).toBeTruthy();
    expect(mapped.get(taskB.body.id)?.completed_at).toBeTruthy();
  });

  it('deletes multiple tasks in one request', async () => {
    const broadcast = vi.fn();
    const appCtx = createTestApp({ broadcast });
    db = appCtx.db;

    const taskA = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'A', status: 'backlog' })
      .expect(201);
    const taskB = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'B', status: 'backlog' })
      .expect(201);

    const result = await request(appCtx.app)
      .post('/api/tasks/bulk/delete')
      .send({ ids: [taskA.body.id, taskB.body.id] })
      .expect(200);

    expect(result.body).toEqual({ deleted: 2 });
    expect(broadcast).toHaveBeenCalledWith({
      type: 'tasks_bulk_updated',
      data: { deleted: 2 },
    });

    const tasks = await request(appCtx.app).get('/api/tasks').expect(200);
    expect(tasks.body).toHaveLength(0);
  });

  it('returns 400 for invalid bulk assignee/status payload', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    const task = await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'A', status: 'backlog' })
      .expect(201);

    // Any string is a valid assignee (dynamic agents), but malformed payloads should be rejected.
    await request(appCtx.app)
      .post('/api/tasks/bulk/assignee')
      .send({ ids: [], assigned_to: 'tee' })
      .expect(400);

    await request(appCtx.app)
      .post('/api/tasks/bulk/assignee')
      .send({ ids: [], assigned_to: 'invalid-user' })
      .expect(400);

    await request(appCtx.app)
      .post('/api/tasks/bulk/assignee')
      .send({ ids: [task.body.id], assigned_to: 123 })
      .expect(400);

    await request(appCtx.app)
      .post('/api/tasks/bulk/assignee')
      .send({ ids: [task.body.id], assigned_to: {} })
      .expect(400);

    await request(appCtx.app)
      .post('/api/tasks/bulk/status')
      .send({ ids: [task.body.id], status: 'invalid' })
      .expect(400);
  });

  it('supports limit and offset pagination in list endpoint', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    await request(appCtx.app).post('/api/tasks').send({ title: 'A', status: 'backlog' }).expect(201);
    await request(appCtx.app).post('/api/tasks').send({ title: 'B', status: 'backlog' }).expect(201);
    await request(appCtx.app).post('/api/tasks').send({ title: 'C', status: 'backlog' }).expect(201);

    const limited = await request(appCtx.app).get('/api/tasks?limit=2').expect(200);
    expect(limited.body).toHaveLength(2);
    expect(limited.body.map((t: TaskLike) => t.id)).toEqual([1, 2]);

    const paged = await request(appCtx.app).get('/api/tasks?limit=1&offset=1').expect(200);
    expect(paged.body).toHaveLength(1);
    expect(paged.body[0].id).toBe(2);

    const offsetOnly = await request(appCtx.app).get('/api/tasks?offset=2').expect(200);
    expect(offsetOnly.body).toHaveLength(1);
    expect(offsetOnly.body[0].id).toBe(3);
  });

  it('returns 400 for invalid pagination params', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    await request(appCtx.app).get('/api/tasks?limit=-1').expect(400);
    await request(appCtx.app).get('/api/tasks?limit=abc').expect(400);
    await request(appCtx.app).get('/api/tasks?offset=-1').expect(400);
    await request(appCtx.app).get('/api/tasks?offset=1.5').expect(400);
  });

  it('returns 400 for invalid id', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    await request(appCtx.app).get('/api/tasks/not-a-number').expect(400);
  });
});
