import type { MocoActivity, MocoProject, MocoProjectReport } from "@/types/moco";

export interface OverBudgetProject {
  projectId: number;
  projectName: string;
  hoursTotal: number;
  hoursPlanned: number;
  hoursOver: number;
  progressPct: number;
}

// NOTE: Budget is project-wide, not per-employee.
// This returns over-budget projects the given user booked hours on.
// Toggle `filterByUser: false` to show ALL over-budget projects globally.
export function calcOverBudgetProjects(
  activities: MocoActivity[],
  projects: MocoProject[],
  reports: Map<number, MocoProjectReport>,
  userId: number,
  filterByUser = true
): OverBudgetProject[] {
  const userProjectIds = new Set(
    activities
      .filter((a) => !filterByUser || a.user.id === userId)
      .map((a) => a.project.id)
  );

  const results: OverBudgetProject[] = [];

  for (const [projectId, report] of reports.entries()) {
    if (filterByUser && !userProjectIds.has(projectId)) continue;

    const isOverBudget =
      report.hours_remaining < 0 || report.budget_progress_in_percentage > 100;

    if (!isOverBudget) continue;

    const project = projects.find((p) => p.id === projectId);

    results.push({
      projectId,
      projectName: project?.name ?? `Projekt #${projectId}`,
      hoursTotal: Math.round(report.hours_total * 10) / 10,
      // Budget-Stunden = gebuchte + (verbleibende, bei Überbudget negativ)
      hoursPlanned: Math.round((report.hours_total + report.hours_remaining) * 10) / 10,
      hoursOver: Math.round(Math.abs(report.hours_remaining) * 10) / 10,
      progressPct: Math.round(report.budget_progress_in_percentage),
    });
  }

  return results.sort((a, b) => b.hoursOver - a.hoursOver);
}
