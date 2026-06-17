// Token-Bucket-Limiter für die MOCO-API.
//
// WICHTIG (gemessen, Juni 2026): MOCO limitiert auf ~5 Requests/SEKUNDE pro
// API-Key. Über diesem Tempo antwortet der Report-Endpunkt mit 429 (ohne
// Retry-After!). Der frühere Throttle hatte einen großen Burst (Bucket 200–300)
// und füllte mit 8–20 Token/s nach -> bei vielen Reports (z. B. "Über Budget"
// eines Mitarbeiters mit 36 Projekten) feuerte er Dutzende Anfragen auf einmal,
// kassierte einen 429-STURM, jeder 429 wurde mit 2s neu eingereiht -> alles
// staute sich 30s+ und der Server fühlte sich "ewig ladend" an, auch für die
// nächste Navigation (geteilte Queue).
//
// Daher: ~5 Token/s, nur kleiner Burst. Dadurch bleiben wir unter dem Limit,
// 429 tritt praktisch nicht mehr auf, und nichts verkeilt. Normale Seiten machen
// nur eine Handvoll Calls (Burst deckt sie sofort ab) -> bleiben schnell. Nur
// report-lastige Karten (Über Budget / firmenweit) laufen bewusst in ~5/s, sind
// aber lazy nachgeladen und 4h gecacht.
const REFILL_MS = 200; // ~5 Token/Sekunde nachfüllen (MOCO-Limit)
const BUCKET_CAPACITY = 8; // nur kleiner Burst — sonst 429-Sturm
const MAX_CONCURRENT = 6;

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
    let attempts = 0;
    const attempt = () => {
      fetch(url, init)
        .then(async (res) => {
          if (res.status === 429 && attempts < 5) {
            // MOCO sendet kein Retry-After -> exponentiell zurückweichen
            // (1s, 2s, 4s …), gedeckelt, statt stur alle 2s zu hämmern.
            attempts++;
            const backoff = Math.min(1000 * 2 ** (attempts - 1), 8000);
            await new Promise((r) => setTimeout(r, backoff));
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
