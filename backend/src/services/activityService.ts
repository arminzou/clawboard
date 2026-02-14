import { HttpError } from '../presentation/http/errors/httpError';
import type { ActivityRepository, CreateActivityBody, ListActivitiesParams } from '../repositories/activityRepository';
import type { Activity, Agent } from '../domain/activity';

export class ActivityService {
  constructor(private readonly repo: ActivityRepository) {}

  list(params: ListActivitiesParams = {}): Activity[] {
    return this.repo.list(params);
  }

  listByAgent(agent: Agent, limit?: number): Activity[] {
    return this.repo.listByAgent(agent, limit);
  }

  create(body: CreateActivityBody): Activity {
    if (!body.agent || !body.activity_type || !body.description) {
      throw new HttpError(400, 'agent, activity_type, and description are required');
    }
    return this.repo.create(body);
  }

  ingestSessions(agents?: string[]) {
    // Interop with legacy JS utility
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ingestSessions } = require('../../utils/ingestSessions');
    return ingestSessions({ agents });
  }

  getStats() {
    return this.repo.getStats();
  }
}
