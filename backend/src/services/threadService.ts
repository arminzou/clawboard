import { HttpError } from '../presentation/http/errors/httpError';
import type { ThreadActorType, ThreadPriority, ThreadStatus } from '../domain/thread';
import { ThreadRepository } from '../repositories/threadRepository';
import {
  assertObjectionEventContract,
  assertPromotionTaskCount,
  assertThreadTransitionAllowed,
  parseAndValidateMentionPayload,
} from './threadValidation';

function normalizeNonEmptyString(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return value.length > 0 ? value : null;
}

function parseBoolean(input: unknown): boolean {
  if (input === true) return true;
  if (input === false || input == null) return false;
  if (typeof input === 'number') return input === 1;
  if (typeof input === 'string') {
    const normalized = input.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }
  return false;
}

const ALLOWED_PRIORITIES: ThreadPriority[] = ['low', 'medium', 'high'];
const ALLOWED_STATUSES: ThreadStatus[] = [
  'open',
  'clarifying',
  'ready_to_plan',
  'pending_approval',
  'promoted',
  'archived',
];

const ALLOWED_ACTOR_TYPES: ThreadActorType[] = ['human', 'agent', 'system'];

const ALLOWED_EVENT_TYPES = [
  'question_opened',
  'clarification_requested',
  'clarification_provided',
  'work_log',
  'proposal_posted',
  'objection_posted',
  'decision_requested',
  'decision_recorded',
  'promoted_to_task',
  'thread_cloned',
  'archived',
] as const;

type AllowedEventType = (typeof ALLOWED_EVENT_TYPES)[number];

const ALLOWED_STANCES = ['agree', 'object', 'needs_info'] as const;
type AllowedStance = (typeof ALLOWED_STANCES)[number];

export class ThreadService {
  constructor(private readonly repo: ThreadRepository) {}

  list(filters: { status?: string; owner_human_id?: string; myAttention?: boolean }) {
    const status = filters.status ? String(filters.status) : undefined;
    if (status && !ALLOWED_STATUSES.includes(status as ThreadStatus)) {
      throw new HttpError(400, 'Invalid status');
    }

    if (filters.myAttention) {
      if (!filters.owner_human_id) {
        throw new HttpError(400, 'owner is required when myAttention=true');
      }
      const buckets = this.repo.listHumanAttention(filters.owner_human_id);
      const flat = [
        ...buckets.needs_decision,
        ...buckets.needs_clarification,
        ...buckets.needs_approval,
        ...buckets.blocked_on_human,
      ];
      const seen = new Set<string>();
      const unique: typeof flat = [];
      for (const thread of flat) {
        if (seen.has(thread.id)) continue;
        seen.add(thread.id);
        unique.push(thread);
      }
      return unique;
    }

    return this.repo.list({
      status: (status as ThreadStatus | undefined) ?? undefined,
      owner_human_id: filters.owner_human_id,
      myAttention: filters.myAttention,
    });
  }

  getById(threadId: string) {
    const thread = this.repo.getById(threadId);
    if (!thread) throw new HttpError(404, 'Thread not found');
    return thread;
  }

  create(body: Record<string, unknown>) {
    const workspaceId = normalizeNonEmptyString(body.workspace_id);
    const title = normalizeNonEmptyString(body.title);
    const problemStatement = normalizeNonEmptyString(body.problem_statement);
    const ownerHumanId = normalizeNonEmptyString(body.owner_human_id);
    const createdByType = normalizeNonEmptyString(body.created_by_type);
    const createdById = normalizeNonEmptyString(body.created_by_id);

    if (!workspaceId || !title || !problemStatement || !ownerHumanId || !createdByType || !createdById) {
      throw new HttpError(400, 'Missing required fields');
    }

    if (createdByType !== 'human' && createdByType !== 'agent') {
      throw new HttpError(400, 'Invalid created_by_type');
    }

    const priority = normalizeNonEmptyString(body.priority);
    if (priority && !ALLOWED_PRIORITIES.includes(priority as ThreadPriority)) {
      throw new HttpError(400, 'Invalid priority');
    }

    return this.repo.create({
      workspace_id: workspaceId,
      title,
      problem_statement: problemStatement,
      owner_human_id: ownerHumanId,
      created_by_type: createdByType,
      created_by_id: createdById,
      priority: (priority as ThreadPriority | undefined) ?? undefined,
      current_state_summary: normalizeNonEmptyString(body.current_state_summary),
    });
  }

  update(threadId: string, patch: Record<string, unknown>) {
    const updates: { title?: string; priority?: ThreadPriority; current_state_summary?: string | null } = {};

    if (Object.prototype.hasOwnProperty.call(patch, 'title')) {
      const value = normalizeNonEmptyString(patch.title);
      if (!value) throw new HttpError(400, 'Invalid title');
      updates.title = value;
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'priority')) {
      const value = normalizeNonEmptyString(patch.priority);
      if (!value || !ALLOWED_PRIORITIES.includes(value as ThreadPriority)) {
        throw new HttpError(400, 'Invalid priority');
      }
      updates.priority = value as ThreadPriority;
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'current_state_summary')) {
      updates.current_state_summary = normalizeNonEmptyString(patch.current_state_summary);
    }

    try {
      return this.repo.update(threadId, updates);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Thread not found') throw new HttpError(404, 'Thread not found');
      if (msg === 'No fields to update') throw new HttpError(400, 'No fields to update');
      throw err;
    }
  }

  transition(threadId: string, body: Record<string, unknown>) {
    const to = normalizeNonEmptyString(body.to) as ThreadStatus | null;
    const actorType = normalizeNonEmptyString(body.actor_type) as ThreadActorType | null;
    const actorId = normalizeNonEmptyString(body.actor_id);

    if (!to || !actorType || !actorId) throw new HttpError(400, 'Missing transition fields');
    if (!ALLOWED_STATUSES.includes(to)) throw new HttpError(400, 'Invalid status');
    if (!ALLOWED_ACTOR_TYPES.includes(actorType)) throw new HttpError(400, 'thread_actor_type_invalid');

    const thread = this.getById(threadId);
    assertThreadTransitionAllowed({ from: thread.status, to, actorType });

    const updated = this.repo.transition(threadId, to);

    if (to === 'archived') {
      this.repo.createEvent({
        thread_id: threadId,
        event_type: 'archived',
        actor_type: actorType,
        actor_id: actorId,
        body_md: body.reason ? String(body.reason) : 'Thread archived',
      });
    }

    return updated;
  }

  clone(threadId: string, body: Record<string, unknown>) {
    const actorType = normalizeNonEmptyString(body.actor_type) as ThreadActorType | null;
    const actorId = normalizeNonEmptyString(body.actor_id);

    if (!actorType || !actorId) throw new HttpError(400, 'Missing clone actor fields');
    if (!ALLOWED_ACTOR_TYPES.includes(actorType)) throw new HttpError(400, 'thread_actor_type_invalid');

    try {
      return this.repo.cloneArchivedThread({
        sourceThreadId: threadId,
        actorType,
        actorId,
        title: normalizeNonEmptyString(body.title) ?? undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Thread not found') throw new HttpError(404, 'Thread not found');
      if (msg === 'thread_clone_requires_archived_source') {
        throw new HttpError(400, 'thread_clone_requires_archived_source');
      }
      throw err;
    }
  }

  listEvents(threadId: string) {
    this.getById(threadId);
    return this.repo.listEvents(threadId);
  }

  createEvent(threadId: string, body: Record<string, unknown>) {
    this.getById(threadId);

    const eventTypeRaw = normalizeNonEmptyString(body.event_type);
    const actorType = normalizeNonEmptyString(body.actor_type) as ThreadActorType | null;
    const actorId = normalizeNonEmptyString(body.actor_id);

    if (!eventTypeRaw || !actorType || !actorId) {
      throw new HttpError(400, 'Missing event fields');
    }

    if (!ALLOWED_ACTOR_TYPES.includes(actorType)) throw new HttpError(400, 'thread_actor_type_invalid');

    if (!ALLOWED_EVENT_TYPES.includes(eventTypeRaw as AllowedEventType)) {
      throw new HttpError(400, 'thread_event_type_invalid');
    }

    const eventType = eventTypeRaw as AllowedEventType;

    const stanceRaw = normalizeNonEmptyString(body.stance);
    const stance: AllowedStance | null = stanceRaw
      ? ALLOWED_STANCES.includes(stanceRaw as AllowedStance)
        ? (stanceRaw as AllowedStance)
        : (() => {
            throw new HttpError(400, 'thread_stance_invalid');
          })()
      : null;

    const mentionHuman = parseBoolean(body.mention_human);
    const mentionPayload = mentionHuman ? parseAndValidateMentionPayload(body.mention_payload) : null;

    assertObjectionEventContract({
      eventType,
      stance,
      metadata: body.metadata,
    });

    return this.repo.createEvent({
      thread_id: threadId,
      event_type: eventType,
      actor_type: actorType,
      actor_id: actorId,
      body_md: normalizeNonEmptyString(body.body_md),
      stance,
      mention_human: mentionHuman,
      mention_payload: mentionPayload,
      metadata: (body.metadata as any) ?? null,
    });
  }

  getPromotionPacket(threadId: string) {
    this.getById(threadId);
    return this.repo.getPromotionPacket(threadId);
  }

  putPromotionPacket(threadId: string, body: Record<string, unknown>) {
    this.getById(threadId);

    const actorType = normalizeNonEmptyString(body.actor_type) as ThreadActorType | null;
    const actorId = normalizeNonEmptyString(body.actor_id);
    if (!actorType || !actorId) {
      throw new HttpError(400, 'Missing actor fields');
    }

    const acceptanceCriteriaRaw = Array.isArray(body.acceptance_criteria)
      ? body.acceptance_criteria.map((item) => String(item).trim()).filter(Boolean)
      : [];

    const packetPreview = {
      problem: normalizeNonEmptyString(body.problem),
      desired_outcome: normalizeNonEmptyString(body.desired_outcome),
      scope_in: normalizeNonEmptyString(body.scope_in),
      scope_out: normalizeNonEmptyString(body.scope_out),
      constraints: normalizeNonEmptyString(body.constraints),
      decision_owner_id: normalizeNonEmptyString(body.decision_owner_id),
      acceptance_criteria: acceptanceCriteriaRaw,
      first_executable_slice: normalizeNonEmptyString(body.first_executable_slice),
    };

    const missingFields = Object.entries(packetPreview)
      .filter(([key, value]) => {
        if (key === 'acceptance_criteria') {
          return !Array.isArray(value) || value.length === 0;
        }
        return !value;
      })
      .map(([key]) => key);

    const isComplete = missingFields.length === 0;

    return this.repo.upsertPromotionPacket({
      thread_id: threadId,
      actor_type: actorType,
      actor_id: actorId,
      ...packetPreview,
      dependencies: body.dependencies,
      risks: body.risks,
      context_links: body.context_links,
      is_complete: isComplete,
      validated_at: isComplete ? new Date().toISOString() : null,
    });
  }

  validatePromotionPacket(threadId: string) {
    this.getById(threadId);
    const packet = this.repo.getPromotionPacket(threadId);
    if (!packet) throw new HttpError(404, 'Promotion packet not found');

    const required = {
      problem: packet.problem,
      desired_outcome: packet.desired_outcome,
      scope_in: packet.scope_in,
      scope_out: packet.scope_out,
      constraints: packet.constraints,
      decision_owner_id: packet.decision_owner_id,
      acceptance_criteria: packet.acceptance_criteria,
      first_executable_slice: packet.first_executable_slice,
    };

    const missing_fields = Object.entries(required)
      .filter(([key, value]) => {
        if (key === 'acceptance_criteria') {
          return !Array.isArray(value) || value.length === 0;
        }
        return !value;
      })
      .map(([key]) => key);

    const is_complete = missing_fields.length === 0;

    this.repo.upsertPromotionPacket({
      thread_id: threadId,
      actor_type: packet.updated_by_type,
      actor_id: packet.updated_by_id,
      problem: packet.problem,
      desired_outcome: packet.desired_outcome,
      scope_in: packet.scope_in,
      scope_out: packet.scope_out,
      constraints: packet.constraints,
      decision_owner_id: packet.decision_owner_id,
      acceptance_criteria: packet.acceptance_criteria,
      first_executable_slice: packet.first_executable_slice,
      dependencies: packet.dependencies,
      risks: packet.risks,
      context_links: packet.context_links,
      is_complete,
      validated_at: is_complete ? new Date().toISOString() : null,
    });

    return {
      is_complete,
      missing_fields,
    };
  }

  promote(threadId: string, body: Record<string, unknown>) {
    const actorType = normalizeNonEmptyString(body.actor_type);
    const actorId = normalizeNonEmptyString(body.actor_id);
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];

    if (actorType !== 'human' || !actorId) {
      throw new HttpError(400, 'promotion_requires_human_actor');
    }

    assertPromotionTaskCount(tasks.length);

    const normalizedTasks = tasks.map((task, index) => {
      if (typeof task !== 'object' || task === null || Array.isArray(task)) {
        throw new HttpError(400, `Invalid task payload at index ${index}`);
      }
      const row = task as Record<string, unknown>;
      const title = normalizeNonEmptyString(row.title);
      if (!title) throw new HttpError(400, `Task title is required at index ${index}`);

      return {
        title,
        description: normalizeNonEmptyString(row.description),
        priority: (normalizeNonEmptyString(row.priority) as 'low' | 'medium' | 'high' | 'urgent' | null) ?? null,
      };
    });

    try {
      return this.repo.promoteThread({
        thread_id: threadId,
        actor_id: actorId,
        tasks: normalizedTasks,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Thread not found') throw new HttpError(404, 'Thread not found');
      if (msg === 'promotion_packet_incomplete') throw new HttpError(400, 'promotion_packet_incomplete');
      if (msg === 'thread_not_pending_approval') throw new HttpError(400, 'thread_not_pending_approval');
      throw err;
    }
  }

  listHumanAttention(humanId: string) {
    if (!normalizeNonEmptyString(humanId)) throw new HttpError(400, 'Invalid human id');
    return this.repo.listHumanAttention(humanId);
  }
}
