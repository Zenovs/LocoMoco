import type {
  MocoActivity,
  MocoConfig,
  MocoEmployment,
  MocoInvoice,
  MocoOffer,
  MocoProject,
  MocoProjectReport,
  MocoSchedule,
  MocoUser,
} from "@/types/moco";
import { cachedFetch } from "./cache";
import { throttledFetch } from "./throttle";

function baseUrl(subdomain: string) {
  return `https://${subdomain}.mocoapp.com/api/v1`;
}

function headers(apiKey: string): HeadersInit {
  return {
    Authorization: `Token token=${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function fetchPage<T>(
  url: string,
  apiKey: string,
  params: Record<string, string>,
  page: number,
  perPage: number
): Promise<Response> {
  const u = buildUrl(url, { ...params, per_page: String(perPage), page: String(page) });
  const res = await throttledFetch(u, { headers: headers(apiKey) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MOCO API ${res.status}: ${text}`);
  }
  return res;
}

// Holt alle Seiten. Liest aus Seite 1 die Gesamtzahl (X-Total) und holt die
// restlichen Seiten PARALLEL (statt sequenziell) — drastisch schneller bei
// großen Datenmengen. Fällt auf Link-Header-Folgen zurück, falls X-Total fehlt.
async function fetchAllPages<T>(
  url: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const perPage = 100;
  const firstRes = await fetchPage<T>(url, apiKey, params, 1, perPage);
  const firstPage = (await firstRes.json()) as T[];

  const total = Number(firstRes.headers.get("X-Total"));
  if (Number.isFinite(total) && total > 0) {
    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) return firstPage;
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map(async (page) => {
        const r = await fetchPage<T>(url, apiKey, params, page, perPage);
        return (await r.json()) as T[];
      })
    );
    return [firstPage, ...rest].flat();
  }

  // Fallback: ohne X-Total sequenziell den Link-Headern folgen
  const results: T[] = [...firstPage];
  let nextUrl: string | null = (() => {
    const link = firstRes.headers.get("Link") ?? "";
    const m = link.match(/<([^>]+)>;\s*rel="next"/);
    return m ? m[1] : null;
  })();
  while (nextUrl) {
    const res = await throttledFetch(nextUrl, { headers: headers(apiKey) });
    if (!res.ok) throw new Error(`MOCO API ${res.status}: ${await res.text()}`);
    results.push(...((await res.json()) as T[]));
    const link = res.headers.get("Link") ?? "";
    const m = link.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = m ? m[1] : null;
  }
  return results;
}

function buildUrl(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

export async function getUsers(config: MocoConfig): Promise<MocoUser[]> {
  return cachedFetch(`users:${config.subdomain}`, () =>
    fetchAllPages<MocoUser>(`${baseUrl(config.subdomain)}/users`, config.apiKey)
  );
}

export async function getEmployments(
  config: MocoConfig
): Promise<MocoEmployment[]> {
  return cachedFetch(`employments:${config.subdomain}`, () =>
    fetchAllPages<MocoEmployment>(`${baseUrl(config.subdomain)}/users/employments`, config.apiKey)
  );
}

export async function getActivities(
  config: MocoConfig,
  from: string,
  to: string,
  userId?: number // optional serverseitig filtern -> viel weniger Daten
): Promise<MocoActivity[]> {
  const key = `activities:${config.subdomain}:${from}:${to}:${userId ?? "all"}`;
  const params: Record<string, string> = { from, to };
  if (userId) params.user_id = String(userId);
  return cachedFetch(key, () =>
    fetchAllPages<MocoActivity>(`${baseUrl(config.subdomain)}/activities`, config.apiKey, params)
  );
}

export async function getProjects(
  config: MocoConfig
): Promise<MocoProject[]> {
  return cachedFetch(`projects:${config.subdomain}`, () =>
    fetchAllPages<MocoProject>(`${baseUrl(config.subdomain)}/projects`, config.apiKey)
  );
}

export async function getProjectReport(
  config: MocoConfig,
  projectId: number
): Promise<MocoProjectReport> {
  const key = `project-report:${config.subdomain}:${projectId}`;
  return cachedFetch(key, async () => {
    const res = await throttledFetch(
      `${baseUrl(config.subdomain)}/projects/${projectId}/report`,
      { headers: headers(config.apiKey) }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MOCO API ${res.status}: ${text}`);
    }
    return (await res.json()) as MocoProjectReport;
  });
}

// Rechnungen. MOCO unterstützt Datumsfilter (date_from/date_to). Wir holen
// standardmäßig das laufende + Vorjahr (für YTD/Trend) und cachen serverseitig.
export async function getInvoices(
  config: MocoConfig,
  dateFrom: string,
  dateTo: string
): Promise<MocoInvoice[]> {
  const key = `invoices:${config.subdomain}:${dateFrom}:${dateTo}`;
  return cachedFetch(key, () =>
    fetchAllPages<MocoInvoice>(`${baseUrl(config.subdomain)}/invoices`, config.apiKey, {
      date_from: dateFrom,
      date_to: dateTo,
    })
  );
}

// Abwesenheiten (Ferien/Krankheit/Feiertag). Defensiv: liefert [] statt zu
// werfen, falls das Modul nicht zugänglich ist (403) — der Rest läuft weiter.
export async function getSchedules(
  config: MocoConfig,
  from: string,
  to: string,
  userId?: number
): Promise<MocoSchedule[]> {
  const key = `schedules:${config.subdomain}:${from}:${to}:${userId ?? "all"}`;
  const params: Record<string, string> = { from, to };
  if (userId) params.user_id = String(userId);
  return cachedFetch(key, () =>
    fetchAllPages<MocoSchedule>(`${baseUrl(config.subdomain)}/schedules`, config.apiKey, params).catch(() => [])
  );
}

// Offerten.
export async function getOffers(config: MocoConfig): Promise<MocoOffer[]> {
  return cachedFetch(`offers:${config.subdomain}`, () =>
    fetchAllPages<MocoOffer>(`${baseUrl(config.subdomain)}/offers`, config.apiKey)
  );
}

export async function testConnection(config: MocoConfig): Promise<void> {
  const res = await fetch(`${baseUrl(config.subdomain)}/users?limit=1`, {
    headers: headers(config.apiKey),
  });
  if (res.ok) return;

  if (res.status === 401) {
    throw new Error("API-Key passt nicht — bitte Key und MOCO-URL prüfen.");
  }
  if (res.status === 404) {
    throw new Error(
      "MOCO-URL nicht gefunden — stimmt die Adresse bzw. Subdomain (z. B. `schnyder`)?"
    );
  }
  if (res.status === 403) {
    // Key authentifiziert, darf aber /users nicht lesen. Gegencheck, ob der Key
    // überhaupt API-Zugriff hat (eigene Projekte darf jeder lesen).
    let keyWorksAtAll = false;
    try {
      const self = await fetch(
        `${baseUrl(config.subdomain)}/projects/assigned?limit=1`,
        { headers: headers(config.apiKey) }
      );
      keyWorksAtAll = self.ok;
    } catch {
      /* Netzwerkfehler ignorieren — unten generische Meldung */
    }
    if (keyWorksAtAll) {
      throw new Error(
        "Dein API-Key funktioniert, hat aber keine Berechtigung, die Mitarbeiterliste zu lesen. " +
          "Loco Moco zeigt unternehmensweite Auswertungen und braucht dafür einen Key von einem " +
          "MOCO-Account mit Administrator- oder Personal-Rechten. Den Key in MOCO unter " +
          "Profil → Integrations eines solchen Accounts erzeugen."
      );
    }
    throw new Error(
      "Zugriff verweigert (403). Für diesen API-Key ist der API-Zugriff bzw. die nötige " +
        "Berechtigung in MOCO nicht freigeschaltet — bitte die Berechtigungen prüfen."
    );
  }
  throw new Error(`API antwortet mit Status ${res.status}.`);
}
