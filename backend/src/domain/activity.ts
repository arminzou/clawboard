export type Agent = string;

export interface Activity {
  id: number;
  agent: Agent;
  activity_type: string;
  description: string;
  details: string | null;
  session_key: string | null;
  timestamp: string;
  related_task_id: number | null;
  source_id: string | null;
}
