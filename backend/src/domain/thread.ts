export type ThreadStatus =
  | 'open'
  | 'clarifying'
  | 'ready_to_plan'
  | 'pending_approval'
  | 'promoted'
  | 'archived';

export type ThreadPriority = 'low' | 'medium' | 'high';

export type ThreadConsensusState = 'aligned' | 'mixed' | 'blocked';

export type ThreadActorType = 'human' | 'agent' | 'system';

export type ThreadEventType =
  | 'question_opened'
  | 'clarification_requested'
  | 'clarification_provided'
  | 'work_log'
  | 'proposal_posted'
  | 'objection_posted'
  | 'decision_requested'
  | 'decision_recorded'
  | 'promoted_to_task'
  | 'thread_cloned'
  | 'archived';

export type ThreadStance = 'agree' | 'object' | 'needs_info';

export interface MentionPayload {
  what_changed: string;
  what_you_need_from_human: string;
  options: string[];
  recommended_option?: string;
  deadline_or_urgency?: string;
}

export interface ObjectionMetadata {
  risk: string;
  alternative: string;
}

export interface QuestionThread {
  id: string;
  workspace_id: string;
  title: string;
  problem_statement: string;
  status: ThreadStatus;
  priority: ThreadPriority;
  owner_human_id: string;
  created_by_type: Exclude<ThreadActorType, 'system'>;
  created_by_id: string;
  current_state_summary: string | null;
  consensus_state: ThreadConsensusState;
  open_disagreements_count: number;
  decision_deadline: string | null;
  last_human_ping_at: string | null;
  cloned_from_thread_id: string | null;
  created_at: string;
  updated_at: string;
}
