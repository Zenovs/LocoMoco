import type { MocoActivity, MocoEmployment, MocoSchedule } from "@/types/moco";
import { employmentUserId, scheduleUserId } from "@/types/moco";

export interface ProductivityResult {
  billableHours: number;
  totalHours: number;
  targetHours: number | null; // Soll, Ferien/Krankheit bereits abgezogen
  absenceHours: number; // wegen Ferien/Krankheit vom Soll abgezogene Stunden
  targetToDate: boolean; // true = Soll nur bis heute gerechnet (aktueller Monat)
  internalHours: number;
  productivityPct: number;
  label: "target" | "total"; // which denominator we used
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

// Soll-Stunden eines Tages: am/pm-Pattern wenn vorhanden, sonst weekly/5 an Mo–Fr.
function dailyExpected(emp: MocoEmployment | undefined, date: Date): number {
  const monIdx = (date.getDay() + 6) % 7; // 0=Mo … 6=So
  const p = emp?.pattern;
  if (p && Array.isArray(p.am) && Array.isArray(p.pm)) return (p.am[monIdx] ?? 0) + (p.pm[monIdx] ?? 0);
  if (emp?.weekly_target_hours) return monIdx <= 4 ? emp.weekly_target_hours / 5 : 0;
  return 0;
}

// Abwesenheits-Anteil je Tag (0/0.5/1) aus den MOCO-Schedules.
function absentFractions(schedules: MocoSchedule[], userId: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of schedules) {
    if (scheduleUserId(s) !== userId) continue;
    const frac = (s.am ? 0.5 : 0) + (s.pm ? 0.5 : 0);
    const f = frac > 0 ? frac : 1;
    m.set(s.date, Math.min(1, Math.max(m.get(s.date) ?? 0, f)));
  }
  return m;
}

export function calcProductivity(
  activities: MocoActivity[],
  employments: MocoEmployment[],
  userId: number,
  year: number,
  month: number,
  schedules: MocoSchedule[] = [], // Ferien/Krankheit
  now: Date = new Date()
): ProductivityResult {
  const userActivities = activities.filter((a) => a.user.id === userId);

  const billableHours = userActivities.filter((a) => a.billable).reduce((s, a) => s + a.hours, 0);
  const totalHours = userActivities.reduce((s, a) => s + a.hours, 0);
  const internalHours = totalHours - billableHours;

  // Soll-Stunden tageweise, Ferien/Krankheit abgezogen (nur zur Anzeige). Im
  // laufenden Monat nur bis heute, sonst der ganze Monat.
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const { target, absence } = calcTargetHours(employments, userId, year, month, schedules, now);

  // Produktivität = verrechenbare ÷ ERFASSTE Stunden (Soll bleibt nur Anzeige).
  const denominator = totalHours || 1;
  const productivityPct = Math.round((billableHours / denominator) * 100);

  return {
    billableHours: Math.round(billableHours * 10) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
    targetHours: target !== null ? Math.round(target * 10) / 10 : null,
    absenceHours: Math.round(absence * 10) / 10,
    targetToDate: isCurrentMonth && target !== null,
    internalHours: Math.round(internalHours * 10) / 10,
    productivityPct,
    label: "total",
  };
}

function calcTargetHours(
  employments: MocoEmployment[],
  userId: number,
  year: number,
  month: number,
  schedules: MocoSchedule[],
  now: Date
): { target: number | null; absence: number } {
  const emp = findEmployment(employments, userId, year, month);
  if (!emp || (!emp.weekly_target_hours && !emp.pattern)) return { target: null, absence: 0 };

  const absent = absentFractions(schedules, userId);
  const pad = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  // Laufender Monat: nur abgeschlossene Tage (bis gestern, heute läuft noch).
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const lastDay = isCurrentMonth ? Math.max(0, now.getDate() - 1) : daysInMonth;

  let target = 0;
  let absence = 0;
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month - 1, d);
    const exp = dailyExpected(emp, date);
    if (exp <= 0) continue; // kein Arbeitstag
    const frac = absent.get(`${year}-${pad(month)}-${pad(d)}`) ?? 0;
    target += exp * (1 - frac); // Soll abzüglich Abwesenheit
    absence += exp * frac;
  }
  return { target, absence };
}
