import type { MocoActivity, MocoInvoice } from "@/types/moco";
import type { Salaries } from "@/lib/salary";
import { vollkosten } from "@/lib/salary";

const r0 = (n: number) => Math.round(n);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const netOf = (i: MocoInvoice) => i.net_total ?? i.gross_total ?? 0;
const IGNORED = new Set(["draft", "ignored", "cancelled", "canceled"]);
const isIssued = (i: MocoInvoice) => !IGNORED.has((i.status ?? "").toLowerCase());

export interface PersonEconomics {
  userId: number;
  name: string;
  costMonthly: number; // Vollkosten/Monat (Bruttolohn × Faktor)
  totalHours: number;
  billableHours: number;
  productivityPct: number; // verrechenbar / erfasst
  sellRate: number;
  producedRevenue: number; // verr. Stunden × Verkaufssatz
  invoicedRevenue: number; // anteiliger Rechnungsumsatz (nach Stundenanteil)
  dbProduced: number; // produziert − Kosten
  dbInvoiced: number; // fakturiert − Kosten
}

// Berechnet die Wirtschaftlichkeit je Person für einen Monat. Nur Personen mit
// FREIGEGEBENEM Lohn werden zurückgegeben. "fakturiert" wird je Projekt nach
// Stundenanteil verteilt (nur Rechnungen mit project_id im Monat).
export function calcEconomics(
  activities: MocoActivity[], // alle MA, gewählter Monat
  invoices: MocoInvoice[],
  salaries: Salaries, // bereits auf "released" gefiltert
  selKey: string // "YYYY-MM"
): PersonEconomics[] {
  // Projekt-Summen (alle MA) für die Umsatzverteilung
  const projectHours = new Map<number, number>();
  for (const a of activities) {
    projectHours.set(a.project.id, (projectHours.get(a.project.id) ?? 0) + a.hours);
  }
  // Fakturierter Umsatz je Projekt im Monat
  const projectInvoiced = new Map<number, number>();
  for (const inv of invoices) {
    if (!isIssued(inv) || !inv.project_id) continue;
    if ((inv.date ?? "").slice(0, 7) !== selKey) continue;
    projectInvoiced.set(inv.project_id, (projectInvoiced.get(inv.project_id) ?? 0) + netOf(inv));
  }

  // Person-Aggregate
  interface Acc { name: string; total: number; billable: number; perProject: Map<number, number> }
  const acc = new Map<number, Acc>();
  for (const a of activities) {
    const cur = acc.get(a.user.id) ?? {
      name: `${a.user.firstname} ${a.user.lastname}`.trim(),
      total: 0, billable: 0, perProject: new Map<number, number>(),
    };
    cur.total += a.hours;
    if (a.billable) cur.billable += a.hours;
    cur.perProject.set(a.project.id, (cur.perProject.get(a.project.id) ?? 0) + a.hours);
    acc.set(a.user.id, cur);
  }

  const out: PersonEconomics[] = [];
  for (const [userId, sal] of Object.entries(salaries)) {
    const id = Number(userId);
    const a = acc.get(id);
    const cost = vollkosten(sal);
    const total = a?.total ?? 0;
    const billable = a?.billable ?? 0;
    const produced = billable * (sal.sellRate || 0);

    // fakturiert anteilig nach Stundenanteil je Projekt
    let invoiced = 0;
    if (a) {
      for (const [pid, hrs] of a.perProject.entries()) {
        const rev = projectInvoiced.get(pid);
        const totHrs = projectHours.get(pid);
        if (rev && totHrs && totHrs > 0) invoiced += rev * (hrs / totHrs);
      }
    }

    out.push({
      userId: id,
      name: a?.name ?? `#${id}`,
      costMonthly: cost,
      totalHours: Math.round(total * 10) / 10,
      billableHours: Math.round(billable * 10) / 10,
      productivityPct: pct(billable, total),
      sellRate: sal.sellRate || 0,
      producedRevenue: r0(produced),
      invoicedRevenue: r0(invoiced),
      dbProduced: r0(produced - cost),
      dbInvoiced: r0(invoiced - cost),
    });
  }
  // Nach Deckungsbeitrag (produziert) absteigend
  return out.sort((x, y) => y.dbProduced - x.dbProduced);
}
