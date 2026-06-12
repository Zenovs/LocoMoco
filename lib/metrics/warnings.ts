import type { ProjectProfit, EmployeePerf, CustomerEcon, ProjectStatus, AgencyUtilization } from "./company";
import type { FinanceReport } from "./finance";

export type WarnSeverity = "high" | "medium" | "low";
export type WarnCategory = "Projekt" | "Mitarbeitende" | "Kunden" | "Finanzen";

export interface Warning {
  severity: WarnSeverity;
  category: WarnCategory;
  title: string;
  detail?: string;
}

// Schwellenwerte (später im Admin konfigurierbar).
export interface WarnThresholds {
  billableLowPct: number; // Verrechenbarkeit-Warnung darunter
  internalHighPct: number; // interner Anteil darüber
  nearBudgetPct: number; // Budget-Warnung ab
  minHours: number; // erst ab so vielen erfassten Stunden bewerten
}
export const DEFAULT_THRESHOLDS: WarnThresholds = {
  billableLowPct: 60, internalHighPct: 40, nearBudgetPct: 80, minHours: 20,
};

const sevRank = { high: 0, medium: 1, low: 2 };

export function calcWarnings(
  projects: ProjectProfit[],
  employees: EmployeePerf[],
  customers: CustomerEcon[],
  projectStatus: ProjectStatus,
  utilization: AgencyUtilization,
  finance: FinanceReport | null,
  t: WarnThresholds = DEFAULT_THRESHOLDS
): Warning[] {
  const w: Warning[] = [];

  // --- Projekte ---
  for (const p of projects) {
    if (p.hoursOver > 0) {
      w.push({ severity: "high", category: "Projekt", title: `${p.projectName} ist über Budget`, detail: `+${p.hoursOver} h über Plan (${p.progressPct} %)${p.customerName !== "—" ? ` · ${p.customerName}` : ""}` });
    } else if (p.hasBudget && p.progressPct >= t.nearBudgetPct) {
      w.push({ severity: "medium", category: "Projekt", title: `${p.projectName} nähert sich dem Budget`, detail: `${p.progressPct} % verbraucht${p.customerName !== "—" ? ` · ${p.customerName}` : ""}` });
    }
  }
  if (projectStatus.noActivity30 > 0) w.push({ severity: "medium", category: "Projekt", title: `${projectStatus.noActivity30} aktive Projekte ohne Aktivität seit 30 Tagen` });
  if (projectStatus.overdue > 0) w.push({ severity: "medium", category: "Projekt", title: `${projectStatus.overdue} Projekte mit überschrittenem Termin` });

  // --- Mitarbeitende ---
  for (const e of employees) {
    if (e.totalHours < t.minHours) continue;
    if (e.billablePct < t.billableLowPct) {
      w.push({ severity: "medium", category: "Mitarbeitende", title: `${e.name}: Verrechenbarkeit niedrig`, detail: `${e.billablePct} % (${e.billableHours} von ${e.totalHours} h)` });
    }
    const internalPct = e.totalHours > 0 ? Math.round((e.internalHours / e.totalHours) * 100) : 0;
    if (internalPct > t.internalHighPct) {
      w.push({ severity: "low", category: "Mitarbeitende", title: `${e.name}: hoher interner Anteil`, detail: `${internalPct} % intern (${e.internalHours} h)` });
    }
  }

  // --- Kunden ---
  const sortedCust = [...customers].sort((a, b) => b.internalHours - a.internalHours);
  const topInternalCust = sortedCust.find((c) => c.customerId >= 0 && c.totalHours >= t.minHours && c.billablePct < t.billableLowPct);
  if (topInternalCust) {
    w.push({ severity: "low", category: "Kunden", title: `${topInternalCust.customerName}: viel unverrechenbarer Aufwand`, detail: `${topInternalCust.billablePct} % verrechenbar (${topInternalCust.totalHours} h)` });
  }

  // --- Finanzen ---
  if (finance) {
    if (finance.invoiceStatus.overdue.count > 0) {
      w.push({ severity: "high", category: "Finanzen", title: `${finance.invoiceStatus.overdue.count} überfällige Rechnungen`, detail: `${finance.invoiceStatus.overdue.net.toLocaleString("de-CH")} CHF offen` });
    }
    if (finance.invoiceStatus.open.net > 0) {
      w.push({ severity: "low", category: "Finanzen", title: `Offene Rechnungen`, detail: `${finance.invoiceStatus.open.net.toLocaleString("de-CH")} CHF unbezahlt (${finance.invoiceStatus.open.count})` });
    }
    const tr = finance.revenue.trend;
    if (tr.length >= 3) {
      const last3 = tr.slice(-3);
      if (last3[0].net > last3[1].net && last3[1].net > last3[2].net && last3[0].net > 0) {
        w.push({ severity: "medium", category: "Finanzen", title: `Umsatz 3 Monate rückläufig`, detail: `${last3.map((x) => `${x.label} ${Math.round(x.net / 1000)}k`).join(" → ")}` });
      }
    }
    for (const m of finance.customerMargins.filter((m) => m.margin < 0).slice(0, 5)) {
      w.push({ severity: "high", category: "Finanzen", title: `${m.name}: negativer Deckungsbeitrag`, detail: `${m.margin.toLocaleString("de-CH")} CHF (Umsatz ${m.revenue.toLocaleString("de-CH")}, Kosten ${m.cost.toLocaleString("de-CH")})` });
    }
  }

  // --- Auslastung gesamt ---
  if (utilization.sollHours > 0 && utilization.billableOfSollPct < t.billableLowPct) {
    w.push({ severity: "medium", category: "Finanzen", title: `Firmen-Verrechenbarkeit unter Ziel`, detail: `${utilization.billableOfSollPct} % der Soll-Stunden verrechenbar` });
  }

  return w.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
}
