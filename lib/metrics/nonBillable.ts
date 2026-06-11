import type { MocoActivity } from "@/types/moco";

export interface NonBillableProject {
  projectId: number;
  projectName: string;
  nonBillableHours: number;
  totalHours: number;
  nonBillablePct: number;
}

export function calcTopNonBillableProjects(
  activities: MocoActivity[],
  userId: number,
  topN = 5
): NonBillableProject[] {
  const userActivities = activities.filter((a) => a.user.id === userId);

  const byProject = new Map<
    number,
    { name: string; nonBillable: number; total: number }
  >();

  for (const a of userActivities) {
    const existing = byProject.get(a.project.id) ?? {
      name: a.project.name,
      nonBillable: 0,
      total: 0,
    };
    existing.total += a.hours;
    if (!a.billable) existing.nonBillable += a.hours;
    byProject.set(a.project.id, existing);
  }

  return [...byProject.entries()]
    .filter(([, v]) => v.total > 0)
    .map(([id, v]) => ({
      projectId: id,
      projectName: v.name,
      nonBillableHours: Math.round(v.nonBillable * 10) / 10,
      totalHours: Math.round(v.total * 10) / 10,
      nonBillablePct: Math.round((v.nonBillable / v.total) * 100),
    }))
    .filter((p) => p.nonBillableHours > 0)
    .sort((a, b) => b.nonBillableHours - a.nonBillableHours)
    .slice(0, topN);
}
