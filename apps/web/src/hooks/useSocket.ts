import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

type EventHandler = (event: RealtimeEvent) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  useEffect(() => {
    const userId =
      localStorage.getItem('cds-role') === 'admin'
        ? '00000000-0000-0000-0000-000000000003'
        : localStorage.getItem('cds-role') === 'provider'
          ? '00000000-0000-0000-0000-000000000002'
          : '00000000-0000-0000-0000-000000000001';

    const socket = io('/ws', {
      query: { userId },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (event: RealtimeEvent) => {
      const handlers = handlersRef.current.get(event.type);
      if (handlers) {
        handlers.forEach((h) => h(event));
      }
      // Also fire wildcard handlers
      const wildcardHandlers = handlersRef.current.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach((h) => h(event));
      }
    });

    socket.on('demand:published', (data: unknown) => {
      const handlers = handlersRef.current.get('demand:published');
      if (handlers) {
        handlers.forEach((h) =>
          h({ type: 'DEMAND_PUBLISHED', payload: data as Record<string, unknown>, timestamp: new Date().toISOString() }),
        );
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const on = useCallback((eventType: string, handler: EventHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);

    return () => {
      handlersRef.current.get(eventType)?.delete(handler);
    };
  }, []);

  return { connected, on, socket: socketRef };
}
