import type {
  MocoActivity,
  MocoEmployment,
  MocoProject,
  MocoProjectReport,
  MocoUser,
} from "@/types/moco";
import { employmentUserId } from "@/types/moco";

const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// ---------------------------------------------------------------------------
// Soll-Stunden eines kompletten Monats für eine Anstellung (am/pm-Pattern oder
// weekly_target/5 an Mo–Fr). Identische Logik wie der Erfassungs-Check.
// ---------------------------------------------------------------------------
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

function dailyExpected(emp: MocoEmployment | undefined, date: Date): number {
  const monIdx = (date.getDay() + 6) % 7; // 0=Mo … 6=So
  const p = emp?.pattern;
  if (p && Array.isArray(p.am) && Array.isArray(p.pm)) {
    return (p.am[monIdx] ?? 0) + (p.pm[monIdx] ?? 0);
  }
  if (emp?.weekly_target_hours) return monIdx <= 4 ? emp.weekly_target_hours / 5 : 0;
  return 0;
}

function monthSoll(emp: MocoEmployment | undefined, year: number, month: number): number {
  if (!emp) return 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  let soll = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    soll += dailyExpected(emp, new Date(year, month - 1, d));
  }
  return soll;
}

// ===========================================================================
// gl.auslastung — Firmenweite Auslastung & Verrechenbarkeit
// ===========================================================================
export interface AgencyUtilization {
  totalHours: number; // erfasste Stunden (alle MA)
  billableHours: number; // davon verrechenbar
  internalHours: number; // davon intern
  billablePct: number; // verrechenbar / erfasst
  sollHours: number; // Soll laut Anstellungen
  utilizationPct: number; // erfasst / Soll
  billableOfSollPct: number; // verrechenbar / Soll (echte "Auslastung")
  headcount: number; // aktive Mitarbeitende mit Soll
}

export function calcAgencyUtilization(
  activities: MocoActivity[],
  employments: MocoEmployment[],
  users: MocoUser[],
  year: number,
  month: number
): AgencyUtilization {
  let total = 0;
  let billable = 0;
  for (const a of activities) {
    total += a.hours;
    if (a.billable) billable += a.hours;
  }

  let soll = 0;
  let headcount = 0;
  for (const u of users) {
    if (!u.active) continue;
    const emp = findEmployment(employments, u.id, year, month);
    const s = monthSoll(emp, year, month);
    if (s > 0) {
      soll += s;
      headcount++;
    }
  }

  const internal = total - billable;
  return {
    totalHours: r1(total),
    billableHours: r1(billable),
    internalHours: r1(internal),
    billablePct: pct(billable, total),
    sollHours: r1(soll),
    utilizationPct: pct(total, soll),
    billableOfSollPct: pct(billable, soll),
    headcount,
  };
}

// ===========================================================================
// prj.rentabilitaet / prj.rangliste — Projekt-Rentabilität (stundenbasiert)
// CHF/Marge folgt später mit Kostensätzen.
// ===========================================================================
export interface ProjectProfit {
  projectId: number;
  projectName: string;
  customerName: string;
  hoursTotal: number; // Lebenszeit (aus Report)
  hoursBillable: number;
  billablePct: number;
  budgetHours: number; // geplant (gebucht + verbleibend)
  progressPct: number; // Budgetfortschritt
  hoursOver: number; // Überschreitung (0 wenn im Budget)
  hasBudget: boolean;
  monthHours: number; // in diesem Monat gebucht
}

export function calcProjectProfit(
  reports: Map<number, MocoProjectReport>,
  projects: Map<number, MocoProject>,
  monthActivities: MocoActivity[]
): ProjectProfit[] {
  const monthByProject = new Map<number, number>();
  for (const a of monthActivities) {
    monthByProject.set(a.project.id, (monthByProject.get(a.project.id) ?? 0) + a.hours);
  }

  const out: ProjectProfit[] = [];
  for (const [projectId, rep] of reports.entries()) {
    const project = projects.get(projectId);
    const budgetHours = rep.hours_total + rep.hours_remaining;
    const hasBudget = budgetHours > 0 && Number.isFinite(rep.budget_progress_in_percentage);
    const over = rep.hours_remaining < 0 ? Math.abs(rep.hours_remaining) : 0;
    out.push({
      projectId,
      projectName: project?.name ?? `Projekt #${projectId}`,
      customerName: project?.customer?.name ?? "—",
      hoursTotal: r1(rep.hours_total),
      hoursBillable: r1(rep.hours_billable),
      billablePct: pct(rep.hours_billable, rep.hours_total),
      budgetHours: r1(Math.max(0, budgetHours)),
      progressPct: Math.round(rep.budget_progress_in_percentage ?? 0),
      hoursOver: r1(over),
      hasBudget,
      monthHours: r1(monthByProject.get(projectId) ?? 0),
    });
  }
  // Standardsortierung: grösste Budgetüberschreitung zuerst, dann meiste Stunden.
  return out.sort((a, b) => b.hoursOver - a.hoursOver || b.hoursTotal - a.hoursTotal);
}

// ===========================================================================
// prj.status — Projektstatus-Ampel
// ===========================================================================
export interface ProjectStatus {
  active: number;
  overBudget: number; // Budget überschritten
  nearBudget: number; // Budget zu ≥80 % (aber nicht über)
  noActivity30: number; // aktiv, aber 30 Tage keine Erfassung
  overdue: number; // finish_date überschritten, noch aktiv
}

export function calcProjectStatus(
  projects: MocoProject[],
  reports: Map<number, MocoProjectReport>,
  allActivities: MocoActivity[], // letzte ~30+ Tage, für "ohne Aktivität"
  today: Date = new Date()
): ProjectStatus {
  const lastActivity = new Map<number, string>();
  for (const a of allActivities) {
    const cur = lastActivity.get(a.project.id);
    if (!cur || a.date > cur) lastActivity.set(a.project.id, a.date);
  }
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const todayISO = today.toISOString().slice(0, 10);

  let active = 0;
  let overBudget = 0;
  let nearBudget = 0;
  let noActivity30 = 0;
  let overdue = 0;

  for (const p of projects) {
    if (!p.active) continue;
    active++;
    const rep = reports.get(p.id);
    if (rep && Number.isFinite(rep.budget_progress_in_percentage)) {
      const prog = rep.budget_progress_in_percentage;
      if (prog > 100 || rep.hours_remaining < 0) overBudget++;
      else if (prog >= 80) nearBudget++;
    }
    const last = lastActivity.get(p.id);
    if (!last || last < cutoffISO) noActivity30++;
    if (p.finish_date && p.finish_date < todayISO) overdue++;
  }

  return { active, overBudget, nearBudget, noActivity30, overdue };
}

// ===========================================================================
// hr.leistung / hr.rangliste — Mitarbeiterleistung (stundenbasiert)
// ===========================================================================
export interface EmployeePerf {
  userId: number;
  name: string;
  totalHours: number;
  billableHours: number;
  internalHours: number;
  billablePct: number; // verrechenbar / erfasst
  sollHours: number;
  utilizationPct: number; // erfasst / Soll
}

export function calcEmployeePerf(
  activities: MocoActivity[],
  employments: MocoEmployment[],
  users: MocoUser[],
  year: number,
  month: number
): EmployeePerf[] {
  const acc = new Map<number, { name: string; total: number; billable: number }>();
  for (const a of activities) {
    const cur = acc.get(a.user.id) ?? {
      name: `${a.user.firstname} ${a.user.lastname}`.trim(),
      total: 0,
      billable: 0,
    };
    cur.total += a.hours;
    if (a.billable) cur.billable += a.hours;
    acc.set(a.user.id, cur);
  }

  const out: EmployeePerf[] = [];
  for (const [userId, v] of acc.entries()) {
    const u = users.find((x) => x.id === userId);
    if (u && !u.active) continue; // inaktive ausblenden
    const soll = monthSoll(findEmployment(employments, userId, year, month), year, month);
    out.push({
      userId,
      name: v.name || (u ? `${u.firstname} ${u.lastname}` : `#${userId}`),
      totalHours: r1(v.total),
      billableHours: r1(v.billable),
      internalHours: r1(v.total - v.billable),
      billablePct: pct(v.billable, v.total),
      sollHours: r1(soll),
      utilizationPct: pct(v.total, soll),
    });
  }
  return out.sort((a, b) => b.billablePct - a.billablePct || b.billableHours - a.billableHours);
}

// ===========================================================================
// kd.wirtschaft / kd.rangliste — Kunden-Wirtschaftlichkeit (stundenbasiert)
// ===========================================================================
export interface CustomerEcon {
  customerId: number;
  customerName: string;
  totalHours: number;
  billableHours: number;
  internalHours: number;
  billablePct: number;
  projectCount: number;
}

export function calcCustomerEcon(
  activities: MocoActivity[],
  projects: Map<number, MocoProject>
): CustomerEcon[] {
  const acc = new Map<number, CustomerEcon & { projects: Set<number> }>();
  for (const a of activities) {
    const project = projects.get(a.project.id);
    const cust = project?.customer;
    const id = cust?.id ?? -1;
    const name = cust?.name ?? "Ohne Kunde";
    const cur =
      acc.get(id) ??
      ({
        customerId: id,
        customerName: name,
        totalHours: 0,
        billableHours: 0,
        internalHours: 0,
        billablePct: 0,
        projectCount: 0,
        projects: new Set<number>(),
      } as CustomerEcon & { projects: Set<number> });
    cur.totalHours += a.hours;
    if (a.billable) cur.billableHours += a.hours;
    cur.projects.add(a.project.id);
    acc.set(id, cur);
  }

  return [...acc.values()]
    .map((c) => ({
      customerId: c.customerId,
      customerName: c.customerName,
      totalHours: r1(c.totalHours),
      billableHours: r1(c.billableHours),
      internalHours: r1(c.totalHours - c.billableHours),
      billablePct: pct(c.billableHours, c.totalHours),
      projectCount: c.projects.size,
    }))
    .sort((a, b) => b.totalHours - a.totalHours);
}

// ===========================================================================
// Gesamtbericht
// ===========================================================================
export interface CompanyReport {
  utilization: AgencyUtilization;
  projects: ProjectProfit[];
  projectStatus: ProjectStatus;
  employees: EmployeePerf[];
  customers: CustomerEcon[];
  // Finanzteil (Rechnungen/Offerten/Marge). null, wenn die MOCO-Module nicht
  // zugänglich sind (z. B. 403) — die Stunden-Karten funktionieren trotzdem.
  finance: import("./finance").FinanceReport | null;
  // Gebündelte Frühwarnungen aus allen obigen Daten.
  warnings: import("./warnings").Warning[];
}
