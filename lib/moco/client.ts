import type {
  MocoActivity,
  MocoConfig,
  MocoEmployment,
  MocoProject,
  MocoProjectReport,
  MocoUser,
} from "@/types/moco";
import { cacheGet, cacheSet } from "./cache";
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

async function fetchAllPages<T>(
  url: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = buildUrl(url, { ...params, per_page: "100" });

  while (nextUrl) {
    const res = await throttledFetch(nextUrl, { headers: headers(apiKey) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MOCO API ${res.status}: ${text}`);
    }
    const page = (await res.json()) as T[];
    results.push(...page);

    const linkHeader = res.headers.get("Link") ?? "";
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match ? match[1] : null;
  }

  return results;
}

function buildUrl(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

export async function getUsers(config: MocoConfig): Promise<MocoUser[]> {
  const key = `users:${config.subdomain}`;
  const cached = cacheGet<MocoUser[]>(key);
  if (cached) return cached;

  const data = await fetchAllPages<MocoUser>(
    `${baseUrl(config.subdomain)}/users`,
    config.apiKey
  );
  cacheSet(key, data);
  return data;
}

export async function getEmployments(
  config: MocoConfig
): Promise<MocoEmployment[]> {
  const key = `employments:${config.subdomain}`;
  const cached = cacheGet<MocoEmployment[]>(key);
  if (cached) return cached;

  const data = await fetchAllPages<MocoEmployment>(
    `${baseUrl(config.subdomain)}/users/employments`,
    config.apiKey
  );
  cacheSet(key, data);
  return data;
}

export async function getActivities(
  config: MocoConfig,
  from: string,
  to: string
): Promise<MocoActivity[]> {
  const key = `activities:${config.subdomain}:${from}:${to}`;
  const cached = cacheGet<MocoActivity[]>(key);
  if (cached) return cached;

  const data = await fetchAllPages<MocoActivity>(
    `${baseUrl(config.subdomain)}/activities`,
    config.apiKey,
    { from, to }
  );
  cacheSet(key, data);
  return data;
}

export async function getProjects(
  config: MocoConfig
): Promise<MocoProject[]> {
  const key = `projects:${config.subdomain}`;
  const cached = cacheGet<MocoProject[]>(key);
  if (cached) return cached;

  const data = await fetchAllPages<MocoProject>(
    `${baseUrl(config.subdomain)}/projects`,
    config.apiKey
  );
  cacheSet(key, data);
  return data;
}

export async function getProjectReport(
  config: MocoConfig,
  projectId: number
): Promise<MocoProjectReport> {
  const key = `project-report:${config.subdomain}:${projectId}`;
  const cached = cacheGet<MocoProjectReport>(key);
  if (cached) return cached;

  const res = await throttledFetch(
    `${baseUrl(config.subdomain)}/projects/${projectId}/report`,
    { headers: headers(config.apiKey) }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MOCO API ${res.status}: ${text}`);
  }
  const data = (await res.json()) as MocoProjectReport;
  cacheSet(key, data);
  return data;
}

export async function testConnection(config: MocoConfig): Promise<void> {
  const res = await fetch(`${baseUrl(config.subdomain)}/users?limit=1`, {
    headers: headers(config.apiKey),
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("API-Key passt nicht — bitte Key und Subdomain prüfen.");
    }
    if (res.status === 404) {
      throw new Error(
        "Subdomain nicht gefunden — stimmt die Schreibweise (z. B. `schnyder`)?"
      );
    }
    throw new Error(`API antwortet mit Status ${res.status}.`);
  }
}
