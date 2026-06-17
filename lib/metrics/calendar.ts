import type { MocoActivity, MocoEmployment, MocoSchedule } from "@/types/moco";
import { employmentUserId, scheduleUserId } from "@/types/moco";

export type DayStatus = "productive" | "low" | "missing" | "absence" | "off" | "future";

export interface CalendarEntry {
  project: string;
  task: string;
  description: string;
  hours: number;
  billable: boolean;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day: number; // 1..31
  weekday: number; // 0=Mo … 6=So
  soll: number; // Tages-Soll (Pensum, ohne Abwesenheit)
  recorded: number;
  billable: number;
  billablePct: number;
  absenceFraction: number; // 0 / 0.5 / 1
  status: DayStatus;
  entries: CalendarEntry[];
}

function findEmployment(employments: MocoEmployment[], userId: number, year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  return employments
    .filter((e) => employmentUserId(e) === userId)
    .find((e) => {
      const from = new Date(e.from);
      const to = e.to ? new Date(e.to) : new Date("9999-12-31");
      return from <= monthEnd && to >= monthStart;
    });
}
function dailyExpected(emp: MocoEmployment | undefined, date: Date): number {
  const monIdx = (date.getDay() + 6) % 7;
  const p = emp?.pattern;
  if (p && Array.isArray(p.am) && Array.isArray(p.pm)) return (p.am[monIdx] ?? 0) + (p.pm[monIdx] ?? 0);
  if (emp?.weekly_target_hours) return monIdx <= 4 ? emp.weekly_target_hours / 5 : 0;
  return 0;
}

export function calcCalendar(
  activities: MocoActivity[],
  employments: MocoEmployment[],
  schedules: MocoSchedule[],
  userId: number,
  year: number,
  month: number,
  thresholdPct = 60, // ab hier gilt ein Tag als produktiv (verrechenbar/erfasst)
  now: Date = new Date()
): CalendarDay[] {
  const emp = findEmployment(employments, userId, year, month);

  // Aktivitäten je Tag
  const byDay = new Map<string, CalendarEntry[]>();
  for (const a of activities) {
    if (a.user.id !== userId) continue;
    const list = byDay.get(a.date) ?? [];
    list.push({
      project: a.project.name,
      task: a.task?.name ?? "",
      description: (a.description ?? "").trim(),
      hours: Math.round(a.hours * 10) / 10,
      billable: a.billable,
    });
    byDay.set(a.date, list);
  }

  // Abwesenheits-Anteil je Tag
  const absent = new Map<string, number>();
  for (const s of schedules) {
    if (scheduleUserId(s) !== userId) continue;
    const frac = (s.am ? 0.5 : 0) + (s.pm ? 0.5 : 0);
    absent.set(s.date, Math.min(1, Math.max(absent.get(s.date) ?? 0, frac > 0 ? frac : 1)));
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayISO = now.toISOString().slice(0, 10);

  const out: CalendarDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const iso = `${year}-${pad(month)}-${pad(d)}`;
    const soll = dailyExpected(emp, date);
    const entries = (byDay.get(iso) ?? []).sort((a, b) => Number(b.billable) - Number(a.billable));
    const recorded = entries.reduce((s, e) => s + e.hours, 0);
    const billable = entries.reduce((s, e) => s + (e.billable ? e.hours : 0), 0);
    const billablePct = recorded > 0 ? Math.round((billable / recorded) * 100) : 0;
    const absenceFraction = absent.get(iso) ?? 0;

    let status: DayStatus;
    if (recorded === 0 && iso > todayISO) status = "future";
    else if (absenceFraction >= 1 && recorded === 0) status = "absence";
    else if (recorded > 0) status = billablePct >= thresholdPct ? "productive" : "low";
    else if (soll > 0 && absenceFraction < 1) status = "missing"; // Arbeitstag ohne Erfassung
    else status = "off"; // Wochenende / kein Soll

    out.push({
      date: iso,
      day: d,
      weekday: (date.getDay() + 6) % 7,
      soll: Math.round(soll * 10) / 10,
      recorded: Math.round(recorded * 10) / 10,
      billable: Math.round(billable * 10) / 10,
      billablePct,
      absenceFraction,
      status,
      entries,
    });
  }
  return out;
}
