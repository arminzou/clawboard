import type { Database } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type {
  MentionPayload,
  ObjectionMetadata,
  QuestionThread,
  ThreadActorType,
  ThreadEventType,
  ThreadPriority,
  ThreadStance,
  ThreadStatus,
} from '../domain/thread';

function parseJson<T>(value: unknown): T | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

type QuestionThreadRow = {
  id: string;
  workspace_id: string;
  title: string;
  problem_statement: string;
  status: ThreadStatus;
  priority: ThreadPriority;
  owner_human_id: string;
  created_by_type: 'human' | 'agent';
  created_by_id: string;
  current_state_summary: string | null;
  consensus_state: 'aligned' | 'mixed' | 'blocked';
  open_disagreements_count: number;
  decision_deadline: string | null;
  last_human_ping_at: string | null;
  cloned_from_thread_id: string | null;
  created_at: string;
  updated_at: string;
};

type ThreadEventRow = {
  id: string;
  thread_id: string;
  event_type: ThreadEventType;
  actor_type: ThreadActorType;
  actor_id: string;
  body_md: string | null;
  stance: ThreadStance | null;
  mention_human: number;
  mention_payload: string | null;
  metadata: string | null;
  created_at: string;
};

type PromotionPacketRow = {
  id: string;
  thread_id: string;
  problem: string | null;
  desired_outcome: string | null;
  scope_in: string | null;
  scope_out: string | null;
  constraints: string | null;
  decision_owner_id: string | null;
  acceptance_criteria: string | null;
  first_executable_slice: string | null;
  dependencies: string | null;
  risks: string | null;
  context_links: string | null;
  is_complete: number;
  validated_at: string | null;
  updated_by_type: ThreadActorType;
  updated_by_id: string;
  created_at: string;
  updated_at: string;
};

function hydrateThread(row: QuestionThreadRow): QuestionThread {
  return {
    ...row,
    current_state_summary: row.current_state_summary ?? null,
    decision_deadline: row.decision_deadline ?? null,
    last_human_ping_at: row.last_human_ping_at ?? null,
    cloned_from_thread_id: row.cloned_from_thread_id ?? null,
  };
}

export type ThreadEvent = {
  id: string;
  thread_id: string;
  event_type: ThreadEventType;
  actor_type: ThreadActorType;
  actor_id: string;
  body_md: string | null;
  stance: ThreadStance | null;
  mention_human: boolean;
  mention_payload: MentionPayload | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type PromotionPacket = {
  id: string;
  thread_id: string;
  problem: string | null;
  desired_outcome: string | null;
  scope_in: string | null;
  scope_out: string | null;
  constraints: string | null;
  decision_owner_id: string | null;
  acceptance_criteria: string[];
  first_executable_slice: string | null;
  dependencies: unknown;
  risks: unknown;
  context_links: unknown;
  is_complete: boolean;
  validated_at: string | null;
  updated_by_type: ThreadActorType;
  updated_by_id: string;
  created_at: string;
  updated_at: string;
};

function hydrateEvent(row: ThreadEventRow): ThreadEvent {
  return {
    ...row,
    body_md: row.body_md ?? null,
    stance: row.stance ?? null,
    mention_human: Boolean(row.mention_human),
    mention_payload: parseJson<MentionPayload>(row.mention_payload),
    metadata: parseJson<Record<string, unknown>>(row.metadata),
  };
}

function hydratePacket(row: PromotionPacketRow): PromotionPacket {
  const parsedCriteria = parseJson<unknown>(row.acceptance_criteria);
  const acceptance = Array.isArray(parsedCriteria)
    ? parsedCriteria.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return {
    ...row,
    acceptance_criteria: acceptance,
    dependencies: parseJson(row.dependencies),
    risks: parseJson(row.risks),
    context_links: parseJson(row.context_links),
    is_complete: Boolean(row.is_complete),
  };
}

export type CreateThreadInput = {
  workspace_id: string;
  title: string;
  problem_statement: string;
  owner_human_id: string;
  created_by_type: 'human' | 'agent';
  created_by_id: string;
  priority?: ThreadPriority;
  status?: ThreadStatus;
  current_state_summary?: string | null;
};

export type UpdateThreadInput = {
  title?: string;
  priority?: ThreadPriority;
  current_state_summary?: string | null;
};

export type ListThreadsFilters = {
  status?: ThreadStatus;
  owner_human_id?: string;
  myAttention?: boolean;
};

export class ThreadRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateThreadInput): QuestionThread {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
        INSERT INTO question_threads (
          id, workspace_id, title, problem_statement, status, priority,
          owner_human_id, created_by_type, created_by_id, current_state_summary,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        id,
        input.workspace_id,
        input.title,
        input.problem_statement,
        input.status ?? 'open',
        input.priority ?? 'medium',
        input.owner_human_id,
        input.created_by_type,
        input.created_by_id,
        normalizeNullableString(input.current_state_summary),
        now,
        now,
      );

    const created = this.getById(id);
    if (!created) throw new Error('Thread not found');
    return created;
  }

  list(filters: ListThreadsFilters = {}): QuestionThread[] {
    let sql = 'SELECT * FROM question_threads';
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      values.push(filters.status);
    }

    if (filters.owner_human_id) {
      conditions.push('owner_human_id = ?');
      values.push(filters.owner_human_id);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY updated_at DESC, id DESC';

    const rows = this.db.prepare(sql).all(...values) as QuestionThreadRow[];
    return rows.map(hydrateThread);
  }

  getById(id: string): QuestionThread | null {
    const row = this.db.prepare('SELECT * FROM question_threads WHERE id = ?').get(id) as QuestionThreadRow | undefined;
    return row ? hydrateThread(row) : null;
  }

  update(id: string, input: UpdateThreadInput): QuestionThread {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title.trim());
    }

    if (input.priority !== undefined) {
      updates.push('priority = ?');
      values.push(input.priority);
    }

    if (Object.prototype.hasOwnProperty.call(input, 'current_state_summary')) {
      updates.push('current_state_summary = ?');
      values.push(normalizeNullableString(input.current_state_summary));
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const result = this.db.prepare(`UPDATE question_threads SET ${updates.join(', ')} WHERE id = ?`).run(...values) as { changes: number };
    if (result.changes === 0) throw new Error('Thread not found');

    const updated = this.getById(id);
    if (!updated) throw new Error('Thread not found');
    return updated;
  }

  transition(id: string, to: ThreadStatus): QuestionThread {
    const now = new Date().toISOString();
    const result = this.db
      .prepare('UPDATE question_threads SET status = ?, updated_at = ? WHERE id = ?')
      .run(to, now, id) as { changes: number };
    if (result.changes === 0) throw new Error('Thread not found');
    const updated = this.getById(id);
    if (!updated) throw new Error('Thread not found');
    return updated;
  }

  cloneArchivedThread(params: {
    sourceThreadId: string;
    actorType: ThreadActorType;
    actorId: string;
    title?: string;
  }): QuestionThread {
    return this.db.transaction(() => {
      const source = this.getById(params.sourceThreadId);
      if (!source) throw new Error('Thread not found');
      if (source.status !== 'archived') throw new Error('thread_clone_requires_archived_source');

      const cloned = this.create({
        workspace_id: source.workspace_id,
        title: normalizeNullableString(params.title) ?? `${source.title} (clone)`,
        problem_statement: source.problem_statement,
        owner_human_id: source.owner_human_id,
        created_by_type: params.actorType === 'system' ? 'human' : params.actorType,
        created_by_id: params.actorId,
        priority: source.priority,
        status: 'open',
        current_state_summary: source.current_state_summary,
      });

      this.db.prepare('UPDATE question_threads SET cloned_from_thread_id = ? WHERE id = ?').run(source.id, cloned.id);

      const clonedWithBacklink = this.getById(cloned.id);
      if (!clonedWithBacklink) throw new Error('Thread not found');

      this.createEvent({
        thread_id: source.id,
        event_type: 'thread_cloned',
        actor_type: params.actorType,
        actor_id: params.actorId,
        body_md: `Cloned to thread ${clonedWithBacklink.id}`,
        metadata: { target_thread_id: clonedWithBacklink.id },
      });

      this.createEvent({
        thread_id: clonedWithBacklink.id,
        event_type: 'thread_cloned',
        actor_type: params.actorType,
        actor_id: params.actorId,
        body_md: `Cloned from thread ${source.id}`,
        metadata: { source_thread_id: source.id },
      });

      return clonedWithBacklink;
    })();
  }

  listEvents(threadId: string): ThreadEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM thread_events WHERE thread_id = ? ORDER BY created_at ASC, id ASC')
      .all(threadId) as ThreadEventRow[];
    return rows.map(hydrateEvent);
  }

  createEvent(input: {
    thread_id: string;
    event_type: ThreadEventType;
    actor_type: ThreadActorType;
    actor_id: string;
    body_md?: string | null;
    stance?: ThreadStance | null;
    mention_human?: boolean;
    mention_payload?: MentionPayload | null;
    metadata?: Record<string, unknown> | ObjectionMetadata | null;
  }): ThreadEvent {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
        INSERT INTO thread_events (
          id, thread_id, event_type, actor_type, actor_id,
          body_md, stance, mention_human, mention_payload, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        id,
        input.thread_id,
        input.event_type,
        input.actor_type,
        input.actor_id,
        normalizeNullableString(input.body_md),
        input.stance ?? null,
        input.mention_human ? 1 : 0,
        input.mention_payload ? JSON.stringify(input.mention_payload) : null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        now,
      );

    const row = this.db.prepare('SELECT * FROM thread_events WHERE id = ?').get(id) as ThreadEventRow | undefined;
    if (!row) throw new Error('Event not found');

    this.db.prepare('UPDATE question_threads SET updated_at = ? WHERE id = ?').run(now, input.thread_id);
    return hydrateEvent(row);
  }

  getPromotionPacket(threadId: string): PromotionPacket | null {
    const row = this.db
      .prepare('SELECT * FROM promotion_packets WHERE thread_id = ?')
      .get(threadId) as PromotionPacketRow | undefined;
    return row ? hydratePacket(row) : null;
  }

  upsertPromotionPacket(input: {
    thread_id: string;
    actor_type: ThreadActorType;
    actor_id: string;
    problem?: string | null;
    desired_outcome?: string | null;
    scope_in?: string | null;
    scope_out?: string | null;
    constraints?: string | null;
    decision_owner_id?: string | null;
    acceptance_criteria?: string[];
    first_executable_slice?: string | null;
    dependencies?: unknown;
    risks?: unknown;
    context_links?: unknown;
    is_complete?: boolean;
    validated_at?: string | null;
  }): PromotionPacket {
    const existing = this.getPromotionPacket(input.thread_id);
    const id = existing?.id ?? randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
        INSERT INTO promotion_packets (
          id, thread_id, problem, desired_outcome, scope_in, scope_out, constraints,
          decision_owner_id, acceptance_criteria, first_executable_slice,
          dependencies, risks, context_links,
          is_complete, validated_at, updated_by_type, updated_by_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(thread_id) DO UPDATE SET
          problem = excluded.problem,
          desired_outcome = excluded.desired_outcome,
          scope_in = excluded.scope_in,
          scope_out = excluded.scope_out,
          constraints = excluded.constraints,
          decision_owner_id = excluded.decision_owner_id,
          acceptance_criteria = excluded.acceptance_criteria,
          first_executable_slice = excluded.first_executable_slice,
          dependencies = excluded.dependencies,
          risks = excluded.risks,
          context_links = excluded.context_links,
          is_complete = excluded.is_complete,
          validated_at = excluded.validated_at,
          updated_by_type = excluded.updated_by_type,
          updated_by_id = excluded.updated_by_id,
          updated_at = excluded.updated_at
      `,
      )
      .run(
        id,
        input.thread_id,
        normalizeNullableString(input.problem),
        normalizeNullableString(input.desired_outcome),
        normalizeNullableString(input.scope_in),
        normalizeNullableString(input.scope_out),
        normalizeNullableString(input.constraints),
        normalizeNullableString(input.decision_owner_id),
        JSON.stringify((input.acceptance_criteria ?? []).map((item) => String(item).trim()).filter(Boolean)),
        normalizeNullableString(input.first_executable_slice),
        input.dependencies == null ? null : JSON.stringify(input.dependencies),
        input.risks == null ? null : JSON.stringify(input.risks),
        input.context_links == null ? null : JSON.stringify(input.context_links),
        input.is_complete ? 1 : 0,
        normalizeNullableString(input.validated_at),
        input.actor_type,
        input.actor_id,
        existing?.created_at ?? now,
        now,
      );

    const packet = this.getPromotionPacket(input.thread_id);
    if (!packet) throw new Error('Promotion packet not found');

    this.db.prepare('UPDATE question_threads SET updated_at = ? WHERE id = ?').run(now, input.thread_id);
    return packet;
  }

  promoteThread(params: {
    thread_id: string;
    actor_id: string;
    tasks: Array<{ title: string; description?: string | null; priority?: 'low' | 'medium' | 'high' | 'urgent' | null }>;
  }): { thread: QuestionThread; created_task_ids: number[] } {
    return this.db.transaction(() => {
      const now = new Date().toISOString();
      const packet = this.getPromotionPacket(params.thread_id);
      if (!packet || !packet.is_complete) throw new Error('promotion_packet_incomplete');

      const thread = this.getById(params.thread_id);
      if (!thread) throw new Error('Thread not found');
      if (thread.status !== 'pending_approval') throw new Error('thread_not_pending_approval');

      const insertTask = this.db.prepare(
        `
        INSERT INTO tasks (title, description, status, priority, created_at, updated_at)
        VALUES (?, ?, 'backlog', ?, ?, ?)
      `,
      );
      const insertLink = this.db.prepare(
        'INSERT INTO thread_task_links (id, thread_id, task_id, link_type, created_at) VALUES (?, ?, ?, ?, ?)',
      );

      const createdTaskIds: number[] = [];
      for (const task of params.tasks) {
        const result = insertTask.run(
          task.title.trim(),
          normalizeNullableString(task.description),
          task.priority ?? null,
          now,
          now,
        ) as { lastInsertRowid: number | bigint };

        const taskId = Number(result.lastInsertRowid);
        createdTaskIds.push(taskId);

        insertLink.run(randomUUID(), params.thread_id, taskId, 'spawned_from_thread', now);
      }

      this.createEvent({
        thread_id: params.thread_id,
        event_type: 'promoted_to_task',
        actor_type: 'human',
        actor_id: params.actor_id,
        body_md: `Promoted with ${createdTaskIds.length} task(s)`,
        metadata: { task_ids: createdTaskIds },
      });

      this.transition(params.thread_id, 'promoted');

      const updated = this.getById(params.thread_id);
      if (!updated) throw new Error('Thread not found');

      return {
        thread: updated,
        created_task_ids: createdTaskIds,
      };
    })();
  }

  listHumanAttention(ownerHumanId: string): {
    needs_decision: QuestionThread[];
    needs_clarification: QuestionThread[];
    needs_approval: QuestionThread[];
    blocked_on_human: QuestionThread[];
  } {
    const threads = this.list({ owner_human_id: ownerHumanId });

    const latestEvents = this.db
      .prepare(
        `
        SELECT e.*
        FROM thread_events e
        JOIN (
          SELECT thread_id, MAX(created_at) AS latest_created_at
          FROM thread_events
          GROUP BY thread_id
        ) latest ON latest.thread_id = e.thread_id AND latest.latest_created_at = e.created_at
      `,
      )
      .all() as ThreadEventRow[];

    const latestByThread = new Map<string, ThreadEvent>();
    for (const row of latestEvents) {
      latestByThread.set(row.thread_id, hydrateEvent(row));
    }

    const buckets = {
      needs_decision: [] as QuestionThread[],
      needs_clarification: [] as QuestionThread[],
      needs_approval: [] as QuestionThread[],
      blocked_on_human: [] as QuestionThread[],
    };

    for (const thread of threads) {
      if (thread.status === 'archived' || thread.status === 'promoted') continue;
      const latestEvent = latestByThread.get(thread.id);

      if (thread.status === 'pending_approval') {
        buckets.needs_approval.push(thread);
        continue;
      }

      if (thread.status === 'clarifying') {
        buckets.needs_clarification.push(thread);
        continue;
      }

      if (latestEvent?.event_type === 'decision_requested') {
        buckets.needs_decision.push(thread);
        continue;
      }

      if (latestEvent?.mention_human) {
        buckets.blocked_on_human.push(thread);
      }
    }

    return buckets;
  }
}
