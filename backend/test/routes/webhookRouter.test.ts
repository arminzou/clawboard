import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';
import { resetConfigCacheForTests } from '../../src/config';

describe('Webhook API', () => {
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

  it('broadcasts allowed agent status updates', async () => {
    const broadcast = vi.fn();
    const appCtx = createTestApp({ broadcast });
    db = appCtx.db;

    await request(appCtx.app)
      .post('/api/webhook/clawboard')
      .send({
        event: 'agent:thinking',
        agentId: 'tee',
        thought: 'working',
        timestamp: '2026-02-20T00:00:00.000Z',
      })
      .expect(200);

    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(broadcast).toHaveBeenCalledWith({
      type: 'agent_status_updated',
      data: {
        agentId: 'tee',
        status: 'thinking',
        lastActivity: '2026-02-20T00:00:00.000Z',
        thought: 'working',
      },
    });
  });

  it('ignores disallowed agents when include filter is configured', async () => {
    process.env.CLAWBOARD_AGENTS_INCLUDE = 'tee';
    resetConfigCacheForTests();

    const broadcast = vi.fn();
    const appCtx = createTestApp({ broadcast });
    db = appCtx.db;

    const res = await request(appCtx.app)
      .post('/api/webhook/clawboard')
      .send({
        event: 'agent:thinking',
        agentId: 'fay',
        thought: 'not allowed',
      })
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      ignored: true,
      reason: 'agent_not_included',
    });
    expect(broadcast).not.toHaveBeenCalled();
  });
});
