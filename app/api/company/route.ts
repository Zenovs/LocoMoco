import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import {
  getActivities,
  getEmployments,
  getProjects,
  getProjectReport,
  getUsers,
  getInvoices,
  getOffers,
} from "@/lib/moco/client";
import { getMonthRange, toISODate, subtractDays } from "@/lib/metrics/dates";
import { cacheGet, cacheSet } from "@/lib/moco/cache";
import { requireDataAll, currentUser, hasCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";
import { makeHourlyCost } from "@/lib/costRates";
import { readSalaries } from "@/lib/salary";
import {
  calcAgencyUtilization,
  calcProjectProfit,
  calcProjectStatus,
  calcEmployeePerf,
  calcCustomerEcon,
  type CompanyReport,
} from "@/lib/metrics/company";
import { calcFinance, type FinanceReport } from "@/lib/metrics/finance";
import { readRates } from "@/lib/rates";
import type { MocoInvoice, MocoOffer, MocoProject, MocoProjectReport } from "@/types/moco";

export const dynamic = "force-dynamic";

// Firmenweite Auswertung ist teuer (alle Aktivitäten + ein Report je aktivem
// Projekt). Ergebnis im geteilten Cache ablegen (wird vom "Aktualisieren"-Button
// mitgeleert), damit Tabwechsel/Reload schnell sind.
const REPORT_TTL_MS = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });
  }

  // Firmenweite Sicht braucht "Alle sehen".
  const guard = await requireDataAll(req);
  if ("error" in guard) return guard.error;

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const year = Number(sp.get("year") ?? now.getFullYear());
  const month = Number(sp.get("month") ?? now.getMonth() + 1);

  // Darf der Anfragende Löhne sehen? Nur dann fliessen lohn-abgeleitete Kosten
  // in die Margen — sonst der Fallback-Satz (kein Lohn-Leck über die Marge).
  const me = authEnabled() ? await currentUser(req) : null;
  const canSalary = !authEnabled() || (!!me && hasCapability(me, "data.salary"));

  // Cache je nach Lohn-Zugriff getrennt (Margen unterscheiden sich).
  const cacheKey = `company-result:${config.subdomain}:${year}:${month}:sal${canSalary ? 1 : 0}`;
  const hit = cacheGet<CompanyReport>(cacheKey);
  if (hit) return NextResponse.json(hit);

  try {
    const { from, to } = getMonthRange(year, month);
    // Fenster der letzten 30 Tage für "Projekte ohne Aktivität" (immer ab heute).
    const recentFrom = toISODate(subtractDays(now, 30));
    const recentTo = toISODate(now);

    const [users, employments, projectList, activities, recentActivities] =
      await Promise.all([
        getUsers(config),
        getEmployments(config),
        getProjects(config),
        getActivities(config, from, to),
        getActivities(config, recentFrom, recentTo),
      ]);

    const projects = new Map<number, MocoProject>(projectList.map((p) => [p.id, p]));

    // Reports nur für Projekte holen, die in diesem Monat bebucht wurden ODER
    // aktiv sind und kürzlich Aktivität hatten — sonst explodiert die Zahl der
    // Einzelabrufe. Wir nehmen die Projekte mit Aktivität (Monat + letzte 30 T).
    const reportIds = new Set<number>();
    for (const a of activities) reportIds.add(a.project.id);
    for (const a of recentActivities) reportIds.add(a.project.id);

    const reportEntries = await Promise.all(
      [...reportIds].map(async (pid) => {
        try {
          return [pid, await getProjectReport(config, pid)] as [number, MocoProjectReport];
        } catch {
          return null;
        }
      })
    );
    const reports = new Map<number, MocoProjectReport>(
      reportEntries.filter(Boolean) as [number, MocoProjectReport][]
    );

    // Finanzteil: Rechnungen + Offerten + Kostensätze. Eigenes try/catch — sind
    // die Module nicht zugänglich (403/404), bleiben die Stunden-Karten heil.
    let finance: FinanceReport | null = null;
    try {
      const invFrom = toISODate(subtractDays(now, 730)); // ~2 Jahre für YTD/offen/überfällig
      const invTo = toISODate(now);
      const [invoices, offers] = await Promise.all([
        getInvoices(config, invFrom, invTo).catch(() => [] as MocoInvoice[]),
        getOffers(config).catch(() => [] as MocoOffer[]),
      ]);
      if (invoices.length || offers.length) {
        // Stundenkosten: Lohn-abgeleitet (nur wenn data.salary), sonst Fallback-Satz.
        const hourlyCost = makeHourlyCost(employments, canSalary ? readSalaries() : {}, readRates(), year, month);
        finance = calcFinance(invoices, offers, activities, projects, hourlyCost, year, month, now);
      }
    } catch {
      finance = null;
    }

    const report: CompanyReport = {
      utilization: calcAgencyUtilization(activities, employments, users, year, month),
      projects: calcProjectProfit(reports, projects, activities),
      projectStatus: calcProjectStatus(projectList, reports, recentActivities, now),
      employees: calcEmployeePerf(activities, employments, users, year, month),
      customers: calcCustomerEcon(activities, projects),
      finance,
    };

    cacheSet(cacheKey, report, REPORT_TTL_MS);
    return NextResponse.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
