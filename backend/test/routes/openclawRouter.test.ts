import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';

describe('OpenClaw API', () => {
  let db: any;

  beforeEach(() => {
    process.env.CLAWBOARD_API_KEY = '';
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('returns status with optional profile maps', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    const res = await request(appCtx.app).get('/api/openclaw/status').expect(200);
    expect(typeof res.body.detected).toBe('boolean');
    expect(Array.isArray(res.body.agents)).toBe(true);
    expect(typeof res.body.pluginAgentProfiles).toBe('object');
    expect(typeof res.body.agentProfiles).toBe('object');
  });
});
