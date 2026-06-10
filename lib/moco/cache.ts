const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet<T>(key: string, data: T, ttlMs = TTL_MS): void {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}
