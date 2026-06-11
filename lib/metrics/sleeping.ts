import type { MocoActivity, MocoProject } from "@/types/moco";

export interface SleepingProject {
  projectId: number;
  projectName: string;
  customerName: string | null;
  lastActivityDate: string | null;
  daysSinceActivity: number;
}

export function calcSleepingProjects(
  recentActivities: MocoActivity[], // activities from last ~65 days
  allProjects: MocoProject[],
  thresholdDays = 60
): SleepingProject[] {
  const activeProjectIds = new Set(recentActivities.map((a) => a.project.id));

  // Abonnement-Projekte werden grundsätzlich ignoriert (laufen dauerhaft).
  const isAbo = (name: string) => name.toLowerCase().includes("abonnement");

  // find last activity date per project from recentActivities
  const lastDateByProject = new Map<number, string>();
  for (const a of recentActivities) {
    const existing = lastDateByProject.get(a.project.id);
    if (!existing || a.date > existing) {
      lastDateByProject.set(a.project.id, a.date);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return allProjects
    .filter((p) => p.active && !activeProjectIds.has(p.id) && !isAbo(p.name))
    .map((p) => {
      const lastDate = lastDateByProject.get(p.id) ?? null;
      const daysSince = lastDate
        ? Math.floor(
            (today.getTime() - new Date(lastDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 9999;
      return {
        projectId: p.id,
        projectName: p.name,
        customerName: p.customer?.name ?? null,
        lastActivityDate: lastDate,
        daysSinceActivity: daysSince,
      };
    })
    .filter((p) => p.daysSinceActivity >= thresholdDays)
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
}
