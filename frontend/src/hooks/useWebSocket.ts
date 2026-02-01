import { useEffect, useMemo, useRef, useState } from 'react';

export type WsMessage = { type: string; data?: any };

const WS_BASE = (import.meta as any).env?.VITE_WS_BASE ?? 'ws://localhost:3001/ws';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const url = useMemo(() => WS_BASE, []);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        setLastMessage(msg);
      } catch {
        // ignore
      }
    };

    return () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  }, [url]);

  return { connected, lastMessage, ws: wsRef.current };
}
