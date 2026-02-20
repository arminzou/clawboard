import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';
import { resetConfigCacheForTests } from '../../src/config';

describe('OpenClaw API', () => {
  let db: any;

  beforeEach(() => {
    process.env.CLAWBOARD_API_KEY = '';
    delete process.env.CLAWBOARD_AGENTS_INCLUDE;
    delete process.env.CLAWBOARD_INCLUDE_AGENTS;
    resetConfigCacheForTests();
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
    expect(Array.isArray(res.body.discoveredAgents)).toBe(true);
    expect(typeof res.body.pluginAgentProfiles).toBe('object');
    expect(typeof res.body.agentProfiles).toBe('object');
  });

  it('applies agent include filter from env', async () => {
    process.env.CLAWBOARD_AGENTS_INCLUDE = 'tee, fay';
    resetConfigCacheForTests();

    const appCtx = createTestApp();
    db = appCtx.db;

    const res = await request(appCtx.app).get('/api/openclaw/status').expect(200);
    expect(res.body.includedAgents).toEqual(['tee', 'fay']);
    expect(res.body.agents).toEqual(['tee', 'fay']);
  });
});
