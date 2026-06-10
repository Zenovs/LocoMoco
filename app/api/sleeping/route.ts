import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getActivities, getProjects } from "@/lib/moco/client";
import { calcSleepingProjects } from "@/lib/metrics/sleeping";
import { subtractDays, toISODate } from "@/lib/metrics/dates";

// Schläferprojekte: global (unabhängig von User/Monat) und teuer (65 Tage
// firmenweite Aktivitäten). Wird vom Dashboard nachgeladen, nachdem die
// schnellen Metriken schon stehen.
export async function GET() {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });
  }

  try {
    const from = toISODate(subtractDays(new Date(), 65));
    const to = toISODate(new Date());
    const [recentActivities, projects] = await Promise.all([
      getActivities(config, from, to),
      getProjects(config),
    ]);
    const sleeping = calcSleepingProjects(recentActivities, projects);
    return NextResponse.json({ sleeping });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
