import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import {
  getActivities,
  getEmployments,
  getProjectReport,
  getProjects,
  getUsers,
} from "@/lib/moco/client";
import { calcProductivity } from "@/lib/metrics/productivity";
import { calcTopNonBillableProjects } from "@/lib/metrics/nonBillable";
import { calcOverBudgetProjects } from "@/lib/metrics/overBudget";
import { addMonths, getMonthRange } from "@/lib/metrics/dates";
import type { MocoProjectReport } from "@/types/moco";

export async function GET(req: NextRequest) {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const userId = Number(sp.get("userId"));
  const year = Number(sp.get("year") ?? new Date().getFullYear());
  const month = Number(sp.get("month") ?? new Date().getMonth() + 1);

  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }

  try {
    const { from, to } = getMonthRange(year, month);
    const prev = addMonths(year, month, -1);
    const { from: prevFrom, to: prevTo } = getMonthRange(prev.year, prev.month);

    const [users, employments, activities, prevActivities, projects] =
      await Promise.all([
        getUsers(config),
        getEmployments(config),
        getActivities(config, from, to),
        getActivities(config, prevFrom, prevTo),
        getProjects(config),
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

    // Metrik 4 (Schläferprojekte) wird separat über /api/sleeping geladen —
    // sie ist global und am teuersten (65 Tage), daher nicht im kritischen Pfad.
    return NextResponse.json({
      users,
      productivity,
      productivityDelta,
      nonBillable,
      overBudget,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
