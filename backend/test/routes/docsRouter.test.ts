import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';

describe('Docs API', () => {
  let db: any;

  beforeEach(() => {
    process.env.CLAWBOARD_API_KEY = '';
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('syncs and lists documents', async () => {
    const broadcast = vi.fn();
    const appCtx = createTestApp({ broadcast });
    db = appCtx.db;

    const sync = await request(appCtx.app)
      .post('/api/docs/sync')
      .send({
        file_path: 'docs/readme.md',
        file_type: 'md',
        last_modified: new Date().toISOString(),
        last_modified_by: 'tee',
        size_bytes: 10,
        git_status: 'modified',
      })
      .expect(200);

    expect(sync.body.file_path).toBe('docs/readme.md');
    expect(broadcast).toHaveBeenCalledWith({ type: 'document_updated', data: sync.body });

    const list = await request(appCtx.app).get('/api/docs?git_status=modified').expect(200);
    expect(list.body).toHaveLength(1);

    // Unknown query params should not break listing.
    await request(appCtx.app).get('/api/docs?project_id=1').expect(200);

    const stats = await request(appCtx.app).get('/api/docs/stats').expect(200);
    expect(stats.body.total).toBe(1);
  });

  it('resyncs documents via utility', async () => {
    const broadcast = vi.fn();
    const syncDocs = () => ({ files: 2, workspaceRoot: '/tmp' });
    const appCtx = createTestApp({ broadcast, syncDocs });
    db = appCtx.db;

    const resync = await request(appCtx.app).post('/api/docs/resync').send({ workspace_root: '/tmp' }).expect(200);
    expect(resync.body.files).toBe(2);
    expect(broadcast).toHaveBeenCalledWith({ type: 'document_resynced', data: { files: 2, workspaceRoot: '/tmp' } });
  });
});
