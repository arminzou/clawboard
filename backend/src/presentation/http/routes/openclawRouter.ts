import express, { type Request, type Response, type NextFunction } from 'express';
import { config } from '../../../config';

export function createOpenClawRouter() {
  const router = express.Router();

  // GET /api/openclaw/status
  router.get('/status', (req: Request, res: Response, next: NextFunction) => {
    try {
      const oc = config.openclaw;
      res.json({
        detected: oc.detected,
        home: oc.home,
        agents: oc.agents,
        pluginAgentProfiles: config.pluginAgentProfiles,
        agentProfiles: config.agentProfiles,
        projectsDir: config.projectsDir,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
