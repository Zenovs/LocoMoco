import type { MocoActivity, MocoEmployment } from "@/types/moco";
import { employmentUserId } from "@/types/moco";
import { getWorkdaysInMonth } from "./dates";

export interface ProductivityResult {
  billableHours: number;
  totalHours: number;
  targetHours: number | null;
  internalHours: number;
  productivityPct: number;
  label: "target" | "total"; // which denominator we used
}

export function calcProductivity(
  activities: MocoActivity[],
  employments: MocoEmployment[],
  userId: number,
  year: number,
  month: number
): ProductivityResult {
  const userActivities = activities.filter((a) => a.user.id === userId);

  const billableHours = userActivities
    .filter((a) => a.billable)
    .reduce((s, a) => s + a.hours, 0);

  const totalHours = userActivities.reduce((s, a) => s + a.hours, 0);
  const internalHours = totalHours - billableHours;

  // Soll-Stunden laut Anstellungsgrad (nur zur Anzeige – NICHT als Nenner).
  const targetHours = calcTargetHours(employments, userId, year, month);

  // Produktivität = verrechenbare ÷ ERFASSTE Stunden.
  const denominator = totalHours || 1;
  const productivityPct = Math.round((billableHours / denominator) * 100);

  return {
    billableHours: Math.round(billableHours * 10) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
    targetHours: targetHours ? Math.round(targetHours * 10) / 10 : null,
    internalHours: Math.round(internalHours * 10) / 10,
    productivityPct,
    label: "total",
  };
}

function calcTargetHours(
  employments: MocoEmployment[],
  userId: number,
  year: number,
  month: number
): number | null {
  // find the employment valid in this month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const emp = employments
    .filter((e) => employmentUserId(e) === userId)
    .find((e) => {
      const from = new Date(e.from);
      const to = e.to ? new Date(e.to) : new Date("9999-12-31");
      return from <= monthEnd && to >= monthStart;
    });

  if (!emp?.weekly_target_hours) return null;

  const workdays = getWorkdaysInMonth(year, month);
  // weekly_target_hours / 5 workdays per week × actual workdays in month
  return (emp.weekly_target_hours / 5) * workdays;
}
