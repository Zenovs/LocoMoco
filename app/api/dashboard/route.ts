import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import {
  getActivities,
  getEmployments,
  getProjectReport,
  getUsers,
} from "@/lib/moco/client";
import { calcProductivity } from "@/lib/metrics/productivity";
import { calcTopNonBillableProjects } from "@/lib/metrics/nonBillable";
import { calcOverBudgetProjects } from "@/lib/metrics/overBudget";
import { calcTimeWasters } from "@/lib/metrics/timeWasters";
import { calcHoursCheck } from "@/lib/metrics/hoursCheck";
import { addMonths, getMonthRange } from "@/lib/metrics/dates";
import { scopedUserId } from "@/lib/access";
import type { MocoProject, MocoProjectReport } from "@/types/moco";

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
    // weniger Daten und damit ein viel schnellerer Erstabruf. getProjects (alle
    // Firmenprojekte) wird hier NICHT geladen — die Projektnamen für "Über
    // Budget" stehen bereits in den Aktivitäten.
    const [users, employments, activities, prevActivities] =
      await Promise.all([
        getUsers(config),
        getEmployments(config),
        getActivities(config, from, to, userId),
        getActivities(config, prevFrom, prevTo, userId),
      ]);

    // Minimale Projektliste (id + name) aus den Aktivitäten ableiten — reicht
    // für die Namensanzeige in calcOverBudgetProjects.
    const projectMap = new Map<number, MocoProject>();
    for (const a of activities) {
      if (!projectMap.has(a.project.id)) {
        projectMap.set(a.project.id, {
          id: a.project.id,
          name: a.project.name,
          active: true,
          billable: a.project.billable,
        });
      }
    }
    const projects = [...projectMap.values()];

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

    // --- Metric 3: Over-budget projects ---
    // Fetch reports for projects the user booked on this month
    const userProjectIds = [
      ...new Set(
        activities.filter((a) => a.user.id === userId).map((a) => a.project.id)
      ),
    ];
    const reportEntries = await Promise.all(
      userProjectIds.map(async (pid) => {
        try {
          const report = await getProjectReport(config, pid);
          return [pid, report] as [number, MocoProjectReport];
        } catch {
          return null;
        }
      })
    );
    const reports = new Map<number, MocoProjectReport>(
      reportEntries.filter(Boolean) as [number, MocoProjectReport][]
    );
    const overBudget = calcOverBudgetProjects(
      activities,
      projects,
      reports,
      userId,
      true
    );

    // Zeitfresser (größte interne Posten) für das Coach-Panel
    const timeWasters = calcTimeWasters(activities, userId);

    // Erfassungs-Check: Soll bis heute vs. erfasst + vergessene Tage
    const hoursCheck = calcHoursCheck(activities, employments, userId, year, month);

    // Metrik 4 (Schläferprojekte) wird separat über /api/sleeping geladen —
    // sie ist global und am teuersten (65 Tage), daher nicht im kritischen Pfad.
    return NextResponse.json({
      users,
      productivity,
      productivityDelta,
      nonBillable,
      overBudget,
      timeWasters,
      hoursCheck,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
