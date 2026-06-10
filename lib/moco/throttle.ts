// ~1 req/sec, max 120/2min — simple token-bucket-lite queue
const INTERVAL_MS = 1050;

let lastCallAt = 0;
let queue: Array<() => void> = [];
let draining = false;

function drain() {
  if (queue.length === 0) {
    draining = false;
    return;
  }
  const now = Date.now();
  const wait = Math.max(0, lastCallAt + INTERVAL_MS - now);
  setTimeout(() => {
    const next = queue.shift();
    if (next) {
      lastCallAt = Date.now();
      next();
    }
    drain();
  }, wait);
}

export function throttledFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  return new Promise((resolve, reject) => {
    queue.push(() => {
      fetch(url, init)
        .then(async (res) => {
          if (res.status === 429) {
            const retryAfter = Number(res.headers.get("Retry-After") ?? 2);
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            // re-queue
            queue.unshift(() => {
              lastCallAt = Date.now();
              fetch(url, init).then(resolve).catch(reject);
            });
          } else {
            resolve(res);
          }
        })
        .catch(reject);
    });
    if (!draining) {
      draining = true;
      drain();
    }
  });
}
