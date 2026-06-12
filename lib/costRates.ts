import type { MocoEmployment } from "@/types/moco";
import { employmentUserId } from "@/types/moco";
import type { Salaries } from "@/lib/salary";
import { vollkosten } from "@/lib/salary";
import type { Rates } from "@/lib/rates";
import { rateFor } from "@/lib/rates";

// Einheitliche Stundenkosten je Person. Quelle der Wahrheit ist der LOHN
// (Vollkosten/Monat ÷ Soll-Stunden); ist kein Lohn hinterlegt — oder darf der
// Anfragende keine Löhne sehen — gilt der Fallback aus den Kostensätzen (rates).
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
function monthSoll(emp: MocoEmployment | undefined, year: number, month: number): number {
  if (!emp) return 0;
  const days = new Date(year, month, 0).getDate();
  let s = 0;
  for (let d = 1; d <= days; d++) s += dailyExpected(emp, new Date(year, month - 1, d));
  return s;
}

// Liefert eine Funktion userId -> CHF/Stunde.
export function makeHourlyCost(
  employments: MocoEmployment[],
  salaries: Salaries, // leer übergeben, wenn der Anfragende keine Löhne sehen darf
  rates: Rates,
  year: number,
  month: number
): (userId: number) => number {
  return (userId: number): number => {
    const sal = salaries[String(userId)];
    if (sal && sal.grossMonthly > 0) {
      const soll = monthSoll(findEmployment(employments, userId, year, month), year, month);
      if (soll > 0) return vollkosten(sal) / soll;
    }
    return rateFor(rates, userId);
  };
}
