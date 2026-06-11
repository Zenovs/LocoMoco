// Token-Bucket-Limiter mit begrenzter Parallelität.
// Erlaubt einen anfänglichen Burst (damit viele Seiten nicht streng seriell mit
// 1/s laufen) und pendelt sich langfristig auf ~1 Request/Sekunde ein — bleibt
// damit innerhalb des MOCO-Limits. 429-Antworten werden respektiert und neu
// eingereiht.
// MOCO verträgt nachweislich >20 parallele Anfragen ohne 429. Daher deutlich
// großzügiger als das alte "1/Sekunde". 429-Antworten werden weiterhin
// respektiert und neu eingereiht (s. unten).
const REFILL_MS = 120; // ~8 Token/Sekunde nachfüllen
const BUCKET_CAPACITY = 200; // großer Burst für Paginierung
const MAX_CONCURRENT = 12;

let tokens = BUCKET_CAPACITY;
let lastRefill = Date.now();
let inFlight = 0;
const queue: Array<() => void> = [];

function refill() {
  const now = Date.now();
  const add = Math.floor((now - lastRefill) / REFILL_MS);
  if (add > 0) {
    tokens = Math.min(BUCKET_CAPACITY, tokens + add);
    lastRefill = now;
  }
}

function pump() {
  refill();
  while (queue.length > 0 && inFlight < MAX_CONCURRENT && tokens > 0) {
    tokens--;
    inFlight++;
    const run = queue.shift()!;
    run();
  }
  if (queue.length > 0) {
    // Nochmal versuchen, sobald wieder Tokens/Slots frei sein könnten
    setTimeout(pump, REFILL_MS);
  }
}

export function throttledFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url, init)
        .then(async (res) => {
          if (res.status === 429) {
            const retryAfter = Number(res.headers.get("Retry-After") ?? 2);
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            inFlight--;
            queue.unshift(attempt); // erneut versuchen
            pump();
          } else {
            inFlight--;
            pump();
            resolve(res);
          }
        })
        .catch((err) => {
          inFlight--;
          pump();
          reject(err);
        });
    };
    queue.push(attempt);
    pump();
  });
}
