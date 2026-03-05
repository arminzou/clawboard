import { HttpError } from '../presentation/http/errors/httpError';
import type { MentionPayload, ObjectionMetadata, ThreadActorType, ThreadEventType, ThreadStatus, ThreadStance } from '../domain/thread';

const ALLOWED_TRANSITIONS: Record<ThreadStatus, ThreadStatus[]> = {
  open: ['clarifying', 'ready_to_plan', 'archived'],
  clarifying: ['ready_to_plan', 'archived'],
  ready_to_plan: ['pending_approval', 'clarifying', 'archived'],
  pending_approval: ['promoted', 'clarifying', 'archived'],
  promoted: ['archived'],
  archived: [],
};

function asNonEmptyString(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return value.length > 0 ? value : null;
}

export function isThreadTransitionAllowed(from: ThreadStatus, to: ThreadStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertThreadTransitionAllowed(params: {
  from: ThreadStatus;
  to: ThreadStatus;
  actorType: ThreadActorType;
}): void {
  const { from, to, actorType } = params;

  if (!isThreadTransitionAllowed(from, to)) {
    throw new HttpError(400, 'thread_transition_invalid');
  }

  if (from === 'pending_approval' && to === 'promoted' && actorType !== 'human') {
    throw new HttpError(403, 'thread_transition_forbidden_actor');
  }
}

export function parseAndValidateMentionPayload(payload: unknown): MentionPayload {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new HttpError(400, 'mention_payload_invalid');
  }

  const candidate = payload as Record<string, unknown>;
  const whatChanged = asNonEmptyString(candidate.what_changed);
  const ask = asNonEmptyString(candidate.what_you_need_from_human);

  if (!whatChanged || !ask || !Array.isArray(candidate.options)) {
    throw new HttpError(400, 'mention_payload_invalid');
  }

  const options = candidate.options
    .map((option) => asNonEmptyString(option))
    .filter((option): option is string => option !== null);

  const recommendedOption = asNonEmptyString(candidate.recommended_option);
  const deadlineOrUrgency = asNonEmptyString(candidate.deadline_or_urgency);

  if (options.length >= 2 && !recommendedOption) {
    throw new HttpError(400, 'mention_payload_invalid');
  }

  return {
    what_changed: whatChanged,
    what_you_need_from_human: ask,
    options,
    ...(recommendedOption ? { recommended_option: recommendedOption } : {}),
    ...(deadlineOrUrgency ? { deadline_or_urgency: deadlineOrUrgency } : {}),
  };
}

export function parseAndValidateObjectionMetadata(metadata: unknown): ObjectionMetadata {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    throw new HttpError(400, 'objection_payload_invalid');
  }

  const candidate = metadata as Record<string, unknown>;
  const risk = asNonEmptyString(candidate.risk);
  const alternative = asNonEmptyString(candidate.alternative);

  if (!risk || !alternative) {
    throw new HttpError(400, 'objection_payload_invalid');
  }

  return { risk, alternative };
}

export function assertObjectionEventContract(params: {
  eventType: ThreadEventType;
  stance: ThreadStance | null | undefined;
  metadata: unknown;
}): void {
  const { eventType, stance, metadata } = params;
  if (eventType !== 'objection_posted') return;

  if (stance !== 'object') {
    throw new HttpError(400, 'objection_payload_invalid');
  }

  parseAndValidateObjectionMetadata(metadata);
}

export function assertPromotionTaskCount(spawnedTaskCount: number): void {
  if (!Number.isInteger(spawnedTaskCount) || spawnedTaskCount < 1) {
    throw new HttpError(400, 'promote_requires_task');
  }
}
