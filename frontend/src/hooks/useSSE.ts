import { useEffect, useRef } from 'react';

type SSEHandler = (data: Record<string, unknown>) => void;

export function useSSE(token: string | null, onMessage: SSEHandler) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');
    const url = `${baseUrl}/api/sse?token=${token}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'connected') onMessage(data);
      } catch (_) {}
    };

    es.onerror = () => {
      es.close();
      // Reconnect after 5s
      setTimeout(() => {
        if (esRef.current === es) esRef.current = null;
      }, 5000);
    };

    return () => { es.close(); esRef.current = null; };
  }, [token]);
}
