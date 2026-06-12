import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import {
  getActivities,
  getEmployments,
  getSchedules,
  getUsers,
} from "@/lib/moco/client";
import { calcProductivity } from "@/lib/metrics/productivity";
import { calcTopNonBillableProjects } from "@/lib/metrics/nonBillable";
import { calcTimeWasters } from "@/lib/metrics/timeWasters";
import { calcHoursCheck } from "@/lib/metrics/hoursCheck";
import { addMonths, getMonthRange } from "@/lib/metrics/dates";
import { scopedUserId } from "@/lib/access";

export async function GET(req: NextRequest) {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const year = Number(sp.get("year") ?? new Date().getFullYear());
  const month = Number(sp.get("month") ?? new Date().getMonth() + 1);

  // Datenscoping: nur eigene Person, außer man hat "alle sehen".
  const scope = await scopedUserId(req, Number(sp.get("userId")));
  if ("error" in scope) return scope.error;
  const userId = scope.userId;
  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }

  try {
    const { from, to } = getMonthRange(year, month);
    const prev = addMonths(year, month, -1);
    const { from: prevFrom, to: prevTo } = getMonthRange(prev.year, prev.month);

    // Aktivitäten serverseitig auf die gewählte Person filtern -> deutlich
    // weniger Daten und damit ein viel schnellerer Erstabruf. Nur der laufende
    // und der Vormonat (für die Veränderung) werden geholt — keine Historie.
    // "Über Budget" (teure Projekt-Reports) lädt separat via /api/overbudget.
    const [users, employments, activities, prevActivities, schedules] =
      await Promise.all([
        getUsers(config),
        getEmployments(config),
        getActivities(config, from, to, userId),
        getActivities(config, prevFrom, prevTo, userId),
        getSchedules(config, from, to, userId), // Ferien/Krankheit
      ]);

    // --- Metric 1: Productivity ---
    const productivity = calcProductivity(
      activities,
      employments,
      userId,
      year,
      month
    );
    const prevProductivity = calcProductivity(
      prevActivities,
      employments,
      userId,
      prev.year,
      prev.month
    );
    const productivityDelta =
      productivity.productivityPct - prevProductivity.productivityPct;

    // --- Metric 2: Top 5 non-billable projects ---
    const nonBillable = calcTopNonBillableProjects(activities, userId);

    // Zeitfresser (größte interne Posten) für das Coach-Panel
    const timeWasters = calcTimeWasters(activities, userId);

    // Erfassungs-Check: Soll bis heute vs. erfasst + vergessene Tage
    const hoursCheck = calcHoursCheck(activities, employments, userId, year, month, new Date(), schedules);

    // "Über Budget" (/api/overbudget) und Schläferprojekte (/api/sleeping) laden
    // separat — beides braucht teure Projekt-Reports und ist nicht im kritischen
    // Pfad, damit der Mitarbeiterwechsel sofort reagiert.
    return NextResponse.json({
      users,
      productivity,
      productivityDelta,
      nonBillable,
      timeWasters,
      hoursCheck,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
