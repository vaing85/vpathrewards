/**
 * Simple in-memory cache with TTL (Phase 4 - performance).
 * Use for read-heavy public GET endpoints. Not shared across processes.
 */

const store = new Map<string, { value: unknown; expires: number }>();

const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

export function get<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function set(key: string, value: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheKey(req: { originalUrl: string; method: string }): string {
  return `${req.method}:${req.originalUrl}`;
}

export function clear(): void {
  store.clear();
}
