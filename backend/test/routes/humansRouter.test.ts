import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';

describe('Humans API', () => {
  let db: any;

  beforeEach(() => {
    process.env.PAWVY_API_KEY = '';
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('returns attention buckets derived from thread state and latest events', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    const createThread = async (title: string, status: string) => {
      const created = await request(appCtx.app)
        .post('/api/threads')
        .send({
          workspace_id: 'default',
          title,
          problem_statement: `${title} context`,
          owner_human_id: 'armin',
          created_by_type: 'human',
          created_by_id: 'armin',
        })
        .expect(201);

      if (status !== 'open') {
        if (status === 'clarifying') {
          await request(appCtx.app)
            .post(`/api/threads/${created.body.id}/transition`)
            .send({ to: 'clarifying', actor_type: 'human', actor_id: 'armin' })
            .expect(200);
        }
        if (status === 'pending_approval') {
          await request(appCtx.app)
            .post(`/api/threads/${created.body.id}/transition`)
            .send({ to: 'ready_to_plan', actor_type: 'human', actor_id: 'armin' })
            .expect(200);
          await request(appCtx.app)
            .post(`/api/threads/${created.body.id}/transition`)
            .send({ to: 'pending_approval', actor_type: 'human', actor_id: 'armin' })
            .expect(200);
        }
      }

      return created.body.id as string;
    };

    const clarifyingId = await createThread('Clarifying', 'clarifying');
    const approvalId = await createThread('Approval', 'pending_approval');
    const decisionId = await createThread('Decision', 'open');

    await request(appCtx.app)
      .post(`/api/threads/${decisionId}/events`)
      .send({
        event_type: 'decision_requested',
        actor_type: 'agent',
        actor_id: 'tee',
      })
      .expect(201);

    const attention = await request(appCtx.app)
      .get('/api/humans/armin/attention')
      .expect(200);

    expect(attention.body.needs_clarification.map((t: any) => t.id)).toContain(clarifyingId);
    expect(attention.body.needs_approval.map((t: any) => t.id)).toContain(approvalId);
    expect(attention.body.needs_decision.map((t: any) => t.id)).toContain(decisionId);
  });
});
