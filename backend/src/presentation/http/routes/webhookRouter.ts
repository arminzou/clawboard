import express, { type Request, type Response, type NextFunction } from 'express';
import { config } from '../../../config';

export function createWebhookRouter({ broadcast }: { broadcast?: (data: unknown) => void }) {
  const router = express.Router();

  // POST /api/webhook/clawboard - Receive events from OpenClaw
  router.post('/clawboard', (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = req.body;
      console.log('[webhook] Received:', event);

      // Map incoming fields (our hook sends agentId, event)
      const agentId = event.agentId || event.agent || 'unknown';
      const eventType = event.event || event.type || 'unknown';

      // Broadcast to WebSocket clients
      if (broadcast) {
        const payload = {
          type: 'agent_status_updated',
          data: {
            agentId,
            status: eventType === 'session:start' ? 'active' : 
                    eventType === 'session:end' ? 'idle' : 
                    eventType === 'thinking' ? 'thinking' : 'active',
            lastActivity: event.timestamp,
            thought: event.thought || (eventType === 'session:start' ? 'I am awake!' : undefined),
          }
        };
        console.log('[webhook] Broadcasted agent_status_updated for', agentId);
        broadcast(payload);
      } else {
        console.log('[webhook] WARNING: broadcast not available, skipping');
      }
      
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/webhook/config - Get webhook configuration for OpenClaw
  router.get('/config', (req: Request, res: Response, next: NextFunction) => {
    try {
      // Return webhook URL and configuration info
      res.json({
        enabled: true,
        url: `${req.protocol}://${req.get('host')}/api/webhook/clawboard`,
        events: ['session:start', 'session:end', 'agent:turn', 'task:completed'],
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
