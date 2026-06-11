import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getActivities, getProjects } from "@/lib/moco/client";
import { calcSleepingProjects, type SleepingProject } from "@/lib/metrics/sleeping";
import { subtractDays, toISODate } from "@/lib/metrics/dates";
import { cacheGet, cacheSet } from "@/lib/moco/cache";

// Schläferprojekte: global (unabhängig von User/Monat) und teuer (95 Tage
// firmenweite Aktivitäten, ~50 API-Seiten). Der Status ändert sich kaum, daher
// wird das Ergebnis lange gecacht (6h, auch auf Platte) — so zahlt man die
// einmaligen ~20s nur ~1× pro Tag, danach ist es (auch nach App-Neustart) sofort da.
const SLEEPING_TTL_MS = 6 * 60 * 60 * 1000;

export async function GET() {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });
  }

  const cacheKey = `sleeping-result:${config.subdomain}`;
  const cached = cacheGet<SleepingProject[]>(cacheKey);
  if (cached) {
    return NextResponse.json({ sleeping: cached });
  }

  try {
    // 95-Tage-Fenster: liefert echte "letzte Buchung"-Daten für Projekte, die
    // 60–95 Tage schlafen; alles Ältere zählt als "über 3 Monate".
    const from = toISODate(subtractDays(new Date(), 95));
    const to = toISODate(new Date());
    const [recentActivities, projects] = await Promise.all([
      getActivities(config, from, to),
      getProjects(config),
    ]);
    const sleeping = calcSleepingProjects(recentActivities, projects);
    cacheSet(cacheKey, sleeping, SLEEPING_TTL_MS);
    return NextResponse.json({ sleeping });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
