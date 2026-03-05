import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../utils/testApp';

describe('Threads API', () => {
  let db: any;

  beforeEach(() => {
    process.env.PAWVY_API_KEY = '';
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('creates a thread and logs events with mention payload validation', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    const created = await request(appCtx.app)
      .post('/api/threads')
      .send({
        workspace_id: 'default',
        title: 'Thread one',
        problem_statement: 'Need to ship v1',
        owner_human_id: 'armin',
        created_by_type: 'human',
        created_by_id: 'armin',
      })
      .expect(201);

    const invalidMention = await request(appCtx.app)
      .post(`/api/threads/${created.body.id}/events`)
      .send({
        event_type: 'decision_requested',
        actor_type: 'agent',
        actor_id: 'tee',
        mention_human: true,
        mention_payload: {
          what_changed: 'Plan drafted',
          what_you_need_from_human: 'Pick option',
          options: ['A', 'B'],
        },
      })
      .expect(400);

    expect(invalidMention.body.error).toBe('mention_payload_invalid');

    const validEvent = await request(appCtx.app)
      .post(`/api/threads/${created.body.id}/events`)
      .send({
        event_type: 'decision_requested',
        actor_type: 'agent',
        actor_id: 'tee',
        mention_human: true,
        mention_payload: {
          what_changed: 'Plan drafted',
          what_you_need_from_human: 'Pick option',
          options: ['A', 'B'],
          recommended_option: 'A',
        },
      })
      .expect(201);

    expect(validEvent.body.mention_human).toBe(true);
    expect(validEvent.body.mention_payload.recommended_option).toBe('A');
  });

  it('enforces promote gate: pending approval + complete packet + at least one task', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    const created = await request(appCtx.app)
      .post('/api/threads')
      .send({
        workspace_id: 'default',
        title: 'Promote thread',
        problem_statement: 'Need execution tasks',
        owner_human_id: 'armin',
        created_by_type: 'human',
        created_by_id: 'armin',
      })
      .expect(201);

    await request(appCtx.app)
      .post(`/api/threads/${created.body.id}/transition`)
      .send({ to: 'ready_to_plan', actor_type: 'human', actor_id: 'armin' })
      .expect(200);

    await request(appCtx.app)
      .post(`/api/threads/${created.body.id}/transition`)
      .send({ to: 'pending_approval', actor_type: 'human', actor_id: 'armin' })
      .expect(200);

    await request(appCtx.app)
      .put(`/api/threads/${created.body.id}/promotion-packet`)
      .send({
        actor_type: 'agent',
        actor_id: 'tee',
        problem: 'Problem',
        desired_outcome: 'Outcome',
        scope_in: 'In',
        scope_out: 'Out',
        constraints: 'Constraints',
        decision_owner_id: 'armin',
        acceptance_criteria: ['Works'],
        first_executable_slice: 'Build schema',
      })
      .expect(200);

    const zeroTaskPromote = await request(appCtx.app)
      .post(`/api/threads/${created.body.id}/promote`)
      .send({ actor_type: 'human', actor_id: 'armin', tasks: [] })
      .expect(400);

    expect(zeroTaskPromote.body.error).toBe('promote_requires_task');

    const promoted = await request(appCtx.app)
      .post(`/api/threads/${created.body.id}/promote`)
      .send({
        actor_type: 'human',
        actor_id: 'armin',
        tasks: [{ title: 'Implement first slice' }],
      })
      .expect(200);

    expect(promoted.body.created_task_ids).toHaveLength(1);
    expect(promoted.body.thread.status).toBe('promoted');
  });

  it('enforces clone-only resume from archived threads', async () => {
    const appCtx = createTestApp();
    db = appCtx.db;

    const created = await request(appCtx.app)
      .post('/api/threads')
      .send({
        workspace_id: 'default',
        title: 'Archived source',
        problem_statement: 'Source context',
        owner_human_id: 'armin',
        created_by_type: 'human',
        created_by_id: 'armin',
      })
      .expect(201);

    await request(appCtx.app)
      .post(`/api/threads/${created.body.id}/transition`)
      .send({ to: 'archived', actor_type: 'human', actor_id: 'armin' })
      .expect(200);

    const cloned = await request(appCtx.app)
      .post(`/api/threads/${created.body.id}/clone`)
      .send({ actor_type: 'human', actor_id: 'armin' })
      .expect(201);

    expect(cloned.body.cloned_from_thread_id).toBe(created.body.id);
  });
});
