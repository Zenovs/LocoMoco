import type { MocoActivity, MocoEmployment, MocoSchedule } from "@/types/moco";
import { employmentUserId, scheduleUserId } from "@/types/moco";

export interface SaldoResult {
  saldo: number; // erfasst − Soll über den Zeitraum (+ = Über-, − = Minusstunden)
  recorded: number;
  soll: number;
  absenceHours: number;
  from: string;
  to: string;
}

function employmentOn(employments: MocoEmployment[], userId: number, date: Date): MocoEmployment | undefined {
  return employments
    .filter((e) => employmentUserId(e) === userId)
    .find((e) => {
      const from = new Date(e.from);
      const to = e.to ? new Date(e.to) : new Date("9999-12-31");
      return from <= date && to >= date;
    });
}
function dailyExpected(emp: MocoEmployment | undefined, date: Date): number {
  const monIdx = (date.getDay() + 6) % 7;
  const p = emp?.pattern;
  if (p && Array.isArray(p.am) && Array.isArray(p.pm)) return (p.am[monIdx] ?? 0) + (p.pm[monIdx] ?? 0);
  if (emp?.weekly_target_hours) return monIdx <= 4 ? emp.weekly_target_hours / 5 : 0;
  return 0;
}

// Kumuliertes Saldo über einen Zeitraum [from..to] (beide YYYY-MM-DD).
export function calcCumulativeSaldo(
  activities: MocoActivity[],
  employments: MocoEmployment[],
  schedules: MocoSchedule[],
  userId: number,
  from: string,
  to: string
): SaldoResult {
  const recByDay = new Map<string, number>();
  for (const a of activities) {
    if (a.user.id !== userId) continue;
    recByDay.set(a.date, (recByDay.get(a.date) ?? 0) + a.hours);
  }
  const absent = new Map<string, number>();
  for (const s of schedules) {
    if (scheduleUserId(s) !== userId) continue;
    const frac = (s.am ? 0.5 : 0) + (s.pm ? 0.5 : 0);
    absent.set(s.date, Math.min(1, Math.max(absent.get(s.date) ?? 0, frac > 0 ? frac : 1)));
  }

  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const pad = (n: number) => String(n).padStart(2, "0");

  let recorded = 0;
  let soll = 0;
  let absenceHours = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const exp = dailyExpected(employmentOn(employments, userId, d), d);
    const frac = exp > 0 ? absent.get(iso) ?? 0 : 0;
    soll += exp * (1 - frac);
    absenceHours += exp * frac;
    recorded += recByDay.get(iso) ?? 0;
  }

  return {
    saldo: Math.round((recorded - soll) * 10) / 10,
    recorded: Math.round(recorded * 10) / 10,
    soll: Math.round(soll * 10) / 10,
    absenceHours: Math.round(absenceHours * 10) / 10,
    from,
    to,
  };
}
