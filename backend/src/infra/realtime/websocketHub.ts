import { WebSocketServer, type WebSocket } from 'ws';
import type http from 'http';

export type BroadcastFn = (data: unknown) => void;

export function createWebSocketHub({
  server,
  path = '/ws',
  isAuthorized,
  log = console,
}: {
  server: http.Server;
  path?: string;
  isAuthorized: (req: http.IncomingMessage) => boolean;
  log?: Pick<Console, 'log' | 'error' | 'warn'>;
}) {
  const wss = new WebSocketServer({ server, path });

  const broadcast: BroadcastFn = (data: unknown) => {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client: WebSocket) => {
      // 1 = OPEN
      if (client.readyState === 1) client.send(payload);
    });
  };

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    if (!isAuthorized(req)) {
      try {
        ws.close(1008, 'Unauthorized');
      } catch {
        // ignore
      }
      return;
    }

    log.log('WebSocket client connected');

    ws.on('message', (message) => {
      log.log('Received:', message.toString());
    });

    ws.on('close', () => {
      log.log('WebSocket client disconnected');
    });
  });

  return { wss, broadcast };
}
