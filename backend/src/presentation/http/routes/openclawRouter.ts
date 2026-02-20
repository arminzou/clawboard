import express, { type Request, type Response, type NextFunction } from 'express';
import { config } from '../../../config';

function filterProfileMap<T>(profiles: Record<string, T>, includeList: string[] | null): Record<string, T> {
  if (includeList == null) return profiles;
  const out: Record<string, T> = {};
  const includeSet = new Set(includeList.map((id) => String(id).trim().toLowerCase()));
  for (const [rawId, value] of Object.entries(profiles)) {
    const id = String(rawId).trim().toLowerCase();
    if (!id || !includeSet.has(id)) continue;
    out[id] = value;
  }
  return out;
}

export function createOpenClawRouter() {
  const router = express.Router();

  // GET /api/openclaw/status
  router.get('/status', (req: Request, res: Response, next: NextFunction) => {
    try {
      const oc = config.openclaw;
      const includedAgents = config.includedAgents;
      const visibleAgents = includedAgents ?? oc.agents;
      res.json({
        detected: oc.detected,
        home: oc.home,
        agents: visibleAgents,
        discoveredAgents: oc.agents,
        includedAgents,
        pluginAgentProfiles: filterProfileMap(config.pluginAgentProfiles, includedAgents),
        agentProfiles: filterProfileMap(config.agentProfiles, includedAgents),
        projectsDir: config.projectsDir,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
