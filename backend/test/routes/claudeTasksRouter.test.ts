import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';

describe('Claude Tasks API', () => {
  let db: ReturnType<typeof createTestApp>['db'] | null = null;
  let previousHome: string | undefined;

  beforeEach(() => {
    process.env.CLAWBOARD_API_KEY = '';
    previousHome = process.env.HOME;
  });

  afterEach(() => {
    if (db) db.close();
    db = null;
    process.env.HOME = previousHome;
  });

  it('reads native Claude tasks and maps to Clawboard tasks when possible', async () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'clawboard-claude-tasks-'));
    const workspaceDir = path.join(tempHome, '.claude', 'tasks', 'workspace-a');
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.writeFileSync(path.join(workspaceDir, '.highwatermark'), '42', 'utf8');
    fs.writeFileSync(
      path.join(workspaceDir, 'tasks.json'),
      JSON.stringify([
        {
          id: 'native-1',
          title: 'Sync task #1',
          status: 'in_progress',
          dependencies: ['native-0'],
          updated_at: new Date().toISOString(),
          clawboard_task_id: 1,
        },
      ]),
      'utf8',
    );

    process.env.HOME = tempHome;

    const appCtx = createTestApp();
    db = appCtx.db;

    await request(appCtx.app)
      .post('/api/tasks')
      .send({ title: 'Mapped task', status: 'backlog' })
      .expect(201);

    const res = await request(appCtx.app).get('/api/claude/tasks').expect(200);
    expect(res.body.workspaces).toEqual(
      expect.arrayContaining([expect.objectContaining({ workspace_id: 'workspace-a', highwatermark: 42 })]),
    );
    expect(res.body.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'native-1',
          title: 'Sync task #1',
          status: 'in_progress',
          dependencies: ['native-0'],
          mapped_task_id: 1,
          mapped_task_title: 'Mapped task',
        }),
      ]),
    );
  });
});

