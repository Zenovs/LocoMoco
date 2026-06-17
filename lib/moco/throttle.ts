// Token-Bucket-Limiter mit Prioritäten für die MOCO-API.
//
// WICHTIG (gemessen, Juni 2026): MOCO limitiert auf ~5 Requests/SEKUNDE pro
// API-Key. Über diesem Tempo antwortet u. a. der Report-Endpunkt mit 429 (ohne
// Retry-After!). Feuert man viele Reports auf einmal (z. B. "Über Budget" eines
// Mitarbeiters mit 36 Projekten oder die firmenweite Auswertung mit ~100
// Reports), gibt es einen 429-Sturm und alles staut sich.
//
// Daher zwei Dinge:
//  1) ~5 Token/s, nur kleiner Burst -> wir bleiben unter dem Limit, kaum 429.
//  2) ZWEI Prioritäten: report-/bulk-lastige Abrufe laufen NACHRANGIG. So
//     überholen UI-kritische Calls (Mitarbeiterliste, Dashboard, Saldo) die
//     langsame Report-Flut IMMER -> das Dropdown/Dashboard ist sofort da, die
//     schweren Karten füllen sich im Hintergrund. (Sonst hing die Userliste bis
//     zu 20s hinter den ~100 firmenweiten Reports -> "keine Mitarbeiter".)
//
// 429 wird mit gedeckeltem exponentiellem Backoff IMMER neu versucht (nie hart
// fehlschlagen lassen — sonst ist die Userliste plötzlich leer).
const REFILL_MS = 200; // ~5 Token/Sekunde nachfüllen (MOCO-Limit)
const BUCKET_CAPACITY = 8; // nur kleiner Burst — sonst 429-Sturm
const MAX_CONCURRENT = 6;

let tokens = BUCKET_CAPACITY;
let lastRefill = Date.now();
let inFlight = 0;
const queueHigh: Array<() => void> = []; // UI-kritisch (Default)
const queueLow: Array<() => void> = []; // Reports / Bulk

function refill() {
  const now = Date.now();
  const add = Math.floor((now - lastRefill) / REFILL_MS);
  if (add > 0) {
    tokens = Math.min(BUCKET_CAPACITY, tokens + add);
    lastRefill = now;
  }
}

function nextRun(): (() => void) | undefined {
  return queueHigh.shift() ?? queueLow.shift();
}

function pump() {
  refill();
  while ((queueHigh.length > 0 || queueLow.length > 0) && inFlight < MAX_CONCURRENT && tokens > 0) {
    tokens--;
    inFlight++;
    nextRun()!();
  }
  if (queueHigh.length > 0 || queueLow.length > 0) {
    // Nochmal versuchen, sobald wieder Tokens/Slots frei sein könnten
    setTimeout(pump, REFILL_MS);
  }
}

export function throttledFetch(
  url: string,
  init?: RequestInit,
  opts?: { lowPriority?: boolean }
): Promise<Response> {
  const queue = opts?.lowPriority ? queueLow : queueHigh;
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const attempt = () => {
      fetch(url, init)
        .then((res) => {
          if (res.status === 429) {
            // MOCO sendet kein Retry-After -> exponentiell zurückweichen
            // (1s, 2s, 4s … bis 8s) und IMMER neu versuchen, statt fehlzuschlagen.
            // WICHTIG: Slot SOFORT freigeben (inFlight--) und den Retry per Timer
            // neu einreihen — sonst hielte die Backoff-Pause den Concurrency-Slot
            // und blockierte höher priorisierte Calls (Userliste/Dashboard).
            attempts++;
            const backoff = Math.min(1000 * 2 ** Math.min(attempts - 1, 3), 8000);
            inFlight--;
            pump(); // andere (auch hochpriorisierte) dürfen jetzt sofort laufen
            setTimeout(() => {
              queue.unshift(attempt); // erneut versuchen, vorne in seiner Spur
              pump();
            }, backoff);
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
