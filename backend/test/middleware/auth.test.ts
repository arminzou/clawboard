import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';

describe('API key middleware', () => {
  let db: any;

  afterEach(() => {
    if (db) db.close();
    process.env.CLAWBOARD_API_KEY = '';
  });

  it('blocks requests without key when enabled', async () => {
    process.env.CLAWBOARD_API_KEY = 'secret';
    const appCtx = createTestApp();
    db = appCtx.db;

    await request(appCtx.app).get('/api/tasks').expect(401);

    await request(appCtx.app)
      .get('/api/tasks')
      .set('x-api-key', 'secret')
      .expect(200);
  });
});
