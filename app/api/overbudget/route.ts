import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getActivities, getProjectReport } from "@/lib/moco/client";
import { calcOverBudgetProjects } from "@/lib/metrics/overBudget";
import { getMonthRange } from "@/lib/metrics/dates";
import { scopedUserId } from "@/lib/access";
import type { MocoProject, MocoProjectReport } from "@/types/moco";

export const dynamic = "force-dynamic";

// "Über Budget" getrennt vom Haupt-Dashboard: braucht je Projekt des Mitarbeiters
// einen Projekt-Report. Diese Reports werden jetzt 4h gecacht (s. getProjectReport)
// und mit der firmenweiten Auswertung geteilt -> nach dem ersten Laden sofort.
// Lädt erst NACH dem Dashboard (Frontend), damit der Mitarbeiterwechsel schnell
// reagiert. Die Monatsaktivitäten kommen aus dem Cache (gleicher Schlüssel wie
// /api/dashboard) -> kein Doppelabruf.
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
    const activities = await getActivities(config, from, to, userId);

    const projectMap = new Map<number, MocoProject>();
    for (const a of activities) {
      if (!projectMap.has(a.project.id)) {
        projectMap.set(a.project.id, { id: a.project.id, name: a.project.name, active: true, billable: a.project.billable });
      }
    }
    const projects = [...projectMap.values()];

    const userProjectIds = [
      ...new Set(activities.filter((a) => a.user.id === userId).map((a) => a.project.id)),
    ];
    const reportEntries = await Promise.all(
      userProjectIds.map(async (pid) => {
        try {
          return [pid, await getProjectReport(config, pid)] as [number, MocoProjectReport];
        } catch {
          return null;
        }
      })
    );
    const reports = new Map<number, MocoProjectReport>(
      reportEntries.filter(Boolean) as [number, MocoProjectReport][]
    );

    const overBudget = calcOverBudgetProjects(activities, projects, reports, userId, true);
    return NextResponse.json({ overBudget });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
