import type { MocoActivity, MocoProject, MocoProjectReport } from "@/types/moco";

export interface OverBudgetProject {
  projectId: number;
  projectName: string;
  hoursTotal: number;
  hoursPlanned: number;
  hoursOver: number;
  progressPct: number;
  // Geld (CHF) — nur gesetzt, wenn das Projekt ein Geldbudget hat (budget_total > 0).
  moneyBudget: number | null;
  moneySpent: number | null;
  moneyOver: number | null;
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

    const hasMoneyBudget = (report.budget_total ?? 0) > 0;
    const moneyOver = hasMoneyBudget
      ? Math.max(0, Math.round((report.budget_expensed - report.budget_total) * 100) / 100)
      : null;

    results.push({
      projectId,
      projectName: project?.name ?? `Projekt #${projectId}`,
      hoursTotal: Math.round(report.hours_total * 10) / 10,
      // Budget-Stunden = gebuchte + (verbleibende, bei Überbudget negativ)
      hoursPlanned: Math.round((report.hours_total + report.hours_remaining) * 10) / 10,
      hoursOver: Math.round(Math.abs(report.hours_remaining) * 10) / 10,
      progressPct: Math.round(report.budget_progress_in_percentage),
      moneyBudget: hasMoneyBudget ? Math.round(report.budget_total * 100) / 100 : null,
      moneySpent: hasMoneyBudget ? Math.round(report.budget_expensed * 100) / 100 : null,
      moneyOver,
    });
  }

  return results.sort((a, b) => b.hoursOver - a.hoursOver);
}
