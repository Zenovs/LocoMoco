import type { MocoActivity, MocoEmployment } from "@/types/moco";
import { employmentUserId } from "@/types/moco";

export interface HoursCheckResult {
  hasTarget: boolean; // Stellengrad/Pattern vorhanden?
  isCurrentMonth: boolean;
  asOf: string | null; // letzter berücksichtigter (abgeschlossener) Tag, YYYY-MM-DD
  expectedToDate: number; // Soll bis asOf
  recorded: number; // erfasste Stunden bis asOf
  delta: number; // recorded - expectedToDate (negativ = zu wenig erfasst)
  missingDays: string[]; // Arbeitstage ganz ohne Erfassung (YYYY-MM-DD)
}

function findEmployment(
  employments: MocoEmployment[],
  userId: number,
  year: number,
  month: number
): MocoEmployment | undefined {
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

// Soll-Stunden für einen konkreten Tag — nutzt das MOCO-Arbeitspattern (am/pm
// pro Wochentag) wenn vorhanden, sonst weekly_target/5 an Mo–Fr.
function dailyExpected(emp: MocoEmployment | undefined, date: Date): number {
  const monIdx = (date.getDay() + 6) % 7; // 0=Mo … 6=So
  const p = emp?.pattern;
  if (p && Array.isArray(p.am) && Array.isArray(p.pm)) {
    return (p.am[monIdx] ?? 0) + (p.pm[monIdx] ?? 0);
  }
  if (emp?.weekly_target_hours) {
    return monIdx <= 4 ? emp.weekly_target_hours / 5 : 0;
  }
  return 0;
}

export function calcHoursCheck(
  activities: MocoActivity[],
  employments: MocoEmployment[],
  userId: number,
  year: number,
  month: number,
  now: Date = new Date()
): HoursCheckResult {
  const emp = findEmployment(employments, userId, year, month);
  const hasTarget = !!(emp && (emp.weekly_target_hours || emp.pattern));

  // Erfasste Stunden pro Tag
  const byDay = new Map<string, number>();
  for (const a of activities) {
    if (a.user.id !== userId) continue;
    byDay.set(a.date, (byDay.get(a.date) ?? 0) + a.hours);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  // Aktueller Monat: nur abgeschlossene Tage (bis gestern), heute läuft noch.
  const lastDay = isCurrentMonth ? now.getDate() - 1 : daysInMonth;

  const pad = (n: number) => String(n).padStart(2, "0");
  let expectedToDate = 0;
  let recorded = 0;
  const missingDays: string[] = [];

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month - 1, d);
    const iso = `${year}-${pad(month)}-${pad(d)}`;
    const exp = dailyExpected(emp, date);
    const rec = byDay.get(iso) ?? 0;
    expectedToDate += exp;
    recorded += rec;
    if (exp > 0 && rec === 0) missingDays.push(iso);
  }

  return {
    hasTarget,
    isCurrentMonth,
    asOf: lastDay >= 1 ? `${year}-${pad(month)}-${pad(lastDay)}` : null,
    expectedToDate: Math.round(expectedToDate * 10) / 10,
    recorded: Math.round(recorded * 10) / 10,
    delta: Math.round((recorded - expectedToDate) * 10) / 10,
    missingDays,
  };
}
