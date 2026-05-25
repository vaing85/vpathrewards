import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../api/baseUrl';

type SSEHandler = (data: Record<string, unknown>) => void;

export function useSSE(token: string | null, onMessage: SSEHandler) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    const baseUrl = API_BASE_URL.replace(/\/api$/, '');
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
