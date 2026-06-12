import fs from "fs";
import path from "path";
import crypto from "crypto";

// In-Memory-Cache mit zusätzlicher Disk-Persistenz unter ~/.loco-moco/cache.
// Dadurch sind auch frische App-Starts schnell (der Cache überlebt den
// Server-Neustart). Bei Disk-Fehlern wird transparent auf Memory-only
// zurückgefallen.
const TTL_MS = 20 * 60 * 1000; // 20 Minuten

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const CACHE_DIR = path.join(process.env.HOME ?? "/tmp", ".loco-moco", "cache");

function diskPath(key: string): string {
  const safe = crypto.createHash("sha1").update(key).digest("hex");
  return path.join(CACHE_DIR, `${safe}.json`);
}

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry) {
    if (Date.now() > entry.expires) {
      store.delete(key);
      return null;
    }
    return entry.data;
  }

  // Memory-Miss -> Disk versuchen
  try {
    const raw = fs.readFileSync(diskPath(key), "utf-8");
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > parsed.expires) {
      fs.rmSync(diskPath(key), { force: true });
      return null;
    }
    store.set(key, parsed); // in Memory aufwärmen
    return parsed.data;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, data: T, ttlMs = TTL_MS): void {
  const entry: CacheEntry<T> = { data, expires: Date.now() + ttlMs };
  store.set(key, entry);
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(diskPath(key), JSON.stringify(entry), { mode: 0o600 });
  } catch {
    /* Disk optional — Memory-Cache reicht */
  }
}

// In-Flight-Dedup: Laufen mehrere identische Abrufe gleichzeitig (z. B. /company
// und /wirtschaftlichkeit holen dieselben Firmen-Aktivitäten), teilen sie sich
// EINEN Fetch statt den Server doppelt zu belasten. Verhindert Lastspitzen, die
// die nächste Navigation in einen Timeout laufen lassen.
const inflight = new Map<string, Promise<unknown>>();

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const data = await fetcher();
      cacheSet(key, data, ttlMs);
      return data;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

export function cacheDelete(key: string): void {
  store.delete(key);
  try {
    fs.rmSync(diskPath(key), { force: true });
  } catch {
    /* ignore */
  }
}

// Leert den gesamten Cache (Memory + Disk) — für den "Aktualisieren"-Button.
export function cacheClearAll(): void {
  store.clear();
  inflight.clear();
  try {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
