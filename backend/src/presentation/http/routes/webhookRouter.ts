import express, { type Request, type Response, type NextFunction } from 'express';

type AgentStatus = 'thinking' | 'idle' | 'offline';

const EVENT_STATUS_MAP: Record<string, AgentStatus> = {
  'agent:thinking': 'thinking',
  'agent:idle':     'idle',
  'agent:offline':  'offline',
  'gateway:online': 'idle',
  'gateway:offline':'offline',
};

export function createWebhookRouter({ broadcast }: { broadcast: (data: unknown) => void }) {
  const router = express.Router();

  // POST /api/webhook/clawboard - Receive events from OpenClaw clawboard-agent plugin
  router.post('/clawboard', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;

      const agentId: string = body.agentId || body.agent;
      const eventType: string = body.event || body.type;

      if (!agentId || !eventType) {
        res.status(400).json({ error: 'Missing required fields: agentId, event' });
        return;
      }

      const status = EVENT_STATUS_MAP[eventType];
      if (!status) {
        res.status(400).json({ error: `Unknown event type: ${eventType}` });
        return;
      }

      broadcast({
        type: 'agent_status_updated',
        data: {
          agentId,
          status,
          lastActivity: body.timestamp,
          thought: body.thought,
        },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/webhook/config - Get webhook configuration info
  router.get('/config', (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        enabled: true,
        url: `${req.protocol}://${req.get('host')}/api/webhook/clawboard`,
        events: Object.keys(EVENT_STATUS_MAP),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
