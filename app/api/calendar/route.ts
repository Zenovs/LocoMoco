import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getActivities, getEmployments, getSchedules } from "@/lib/moco/client";
import { getMonthRange } from "@/lib/metrics/dates";
import { scopedUserId } from "@/lib/access";
import { calcCalendar } from "@/lib/metrics/calendar";
import { readTargets } from "@/lib/targets";

export const dynamic = "force-dynamic";

// Monatskalender mit Produktivitäts-Status je Tag + Tagesdetails. Nutzt nur
// Aktivitäten + Anstellungen + Abwesenheiten (alle gecacht).
export async function GET(req: NextRequest) {
  const config = readConfig();
  if (!config) return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const year = Number(sp.get("year") ?? new Date().getFullYear());
  const month = Number(sp.get("month") ?? new Date().getMonth() + 1);

  const scope = await scopedUserId(req, Number(sp.get("userId")));
  if ("error" in scope) return scope.error;
  const userId = scope.userId;
  if (!userId) return NextResponse.json({ error: "userId fehlt." }, { status: 400 });

  try {
    const { from, to } = getMonthRange(year, month);
    const [activities, employments, schedules] = await Promise.all([
      getActivities(config, from, to, userId),
      getEmployments(config),
      getSchedules(config, from, to, userId),
    ]);
    // Produktivitäts-Schwelle: persönliches Ziel, sonst 60 %.
    const threshold = readTargets()[String(userId)] ?? 60;
    const days = calcCalendar(activities, employments, schedules, userId, year, month, threshold);
    return NextResponse.json({ days, threshold });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
