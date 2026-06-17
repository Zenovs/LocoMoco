import type { MocoActivity } from "@/types/moco";

export interface NonBillableEntry {
  date: string; // YYYY-MM-DD
  hours: number;
  description: string; // vom Mitarbeiter erfasster Text
  task: string; // Leistungsart/Tätigkeit
}

export interface NonBillableProject {
  projectId: number;
  projectName: string;
  nonBillableHours: number;
  totalHours: number;
  nonBillablePct: number;
  entries: NonBillableEntry[]; // die einzelnen nicht-verrechenbaren Positionen
}

export function calcTopNonBillableProjects(
  activities: MocoActivity[],
  userId: number,
  topN = 5
): NonBillableProject[] {
  const userActivities = activities.filter((a) => a.user.id === userId);

  const byProject = new Map<
    number,
    { name: string; nonBillable: number; total: number; entries: NonBillableEntry[] }
  >();

  for (const a of userActivities) {
    const existing = byProject.get(a.project.id) ?? {
      name: a.project.name,
      nonBillable: 0,
      total: 0,
      entries: [],
    };
    existing.total += a.hours;
    if (!a.billable) {
      existing.nonBillable += a.hours;
      existing.entries.push({
        date: a.date,
        hours: Math.round(a.hours * 10) / 10,
        description: (a.description ?? "").trim(),
        task: a.task?.name ?? "",
      });
    }
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
      entries: v.entries.sort((a, b) => b.date.localeCompare(a.date)), // neueste zuerst
    }))
    .filter((p) => p.nonBillableHours > 0)
    .sort((a, b) => b.nonBillableHours - a.nonBillableHours)
    .slice(0, topN);
}
