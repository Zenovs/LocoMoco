import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getActivities, getEmployments, getSchedules } from "@/lib/moco/client";
import { calcProductivity } from "@/lib/metrics/productivity";
import { getMonthRange } from "@/lib/metrics/dates";
import { scopedUserId } from "@/lib/access";

// Leichtgewichtige Monats-Kennzahlen für den Monatsvergleich. Nutzt nur
// Aktivitäten + Anstellungen (beide gecacht) — kein Projekt-Report, keine
// Schläferprojekte, daher schnell.
export async function GET(req: NextRequest) {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const year = Number(sp.get("year") ?? new Date().getFullYear());
  const month = Number(sp.get("month") ?? new Date().getMonth() + 1);
  const scope = await scopedUserId(req, Number(sp.get("userId")));
  if ("error" in scope) return scope.error;
  const userId = scope.userId;
  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }

  try {
    const { from, to } = getMonthRange(year, month);
    const [activities, employments, schedules] = await Promise.all([
      getActivities(config, from, to, userId),
      getEmployments(config),
      getSchedules(config, from, to, userId),
    ]);
    const productivity = calcProductivity(activities, employments, userId, year, month, schedules);
    return NextResponse.json({ year, month, productivity });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
