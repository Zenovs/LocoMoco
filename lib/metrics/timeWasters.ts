import type { MocoActivity } from "@/types/moco";

export interface TimeWaster {
  label: string; // "Projekt · Aufgabe"
  hours: number;
}

// Größte interne (nicht verrechenbare) Zeitposten der Person, gruppiert nach
// Projekt + Aufgabe — die typischen "Zeitfresser".
export function calcTimeWasters(
  activities: MocoActivity[],
  userId: number,
  topN = 5
): TimeWaster[] {
  const internal = activities.filter((a) => a.user.id === userId && !a.billable);
  const map = new Map<string, number>();
  for (const a of internal) {
    const label = `${a.project.name} · ${a.task.name}`;
    map.set(label, (map.get(label) ?? 0) + a.hours);
  }
  return [...map.entries()]
    .map(([label, hours]) => ({ label, hours: Math.round(hours * 10) / 10 }))
    .filter((t) => t.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, topN);
}
