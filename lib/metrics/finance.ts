import type {
  MocoActivity,
  MocoInvoice,
  MocoOffer,
  MocoProject,
} from "@/types/moco";

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const netOf = (i: MocoInvoice) => i.net_total ?? i.gross_total ?? 0;
const netOfOffer = (o: MocoOffer) => o.net_total ?? o.gross_total ?? 0;

// Eine Rechnung gilt als "gestellt", wenn sie nicht Entwurf/ignoriert ist.
const IGNORED = new Set(["draft", "ignored", "cancelled", "canceled"]);
const isIssued = (i: MocoInvoice) => !IGNORED.has((i.status ?? "").toLowerCase());
const isPaid = (i: MocoInvoice) => (i.status ?? "").toLowerCase() === "paid";
function isOverdue(i: MocoInvoice, todayISO: string): boolean {
  if (!isIssued(i) || isPaid(i)) return false;
  if ((i.status ?? "").toLowerCase() === "overdue") return true;
  return !!i.due_date && i.due_date < todayISO;
}

const invCustomerId = (i: MocoInvoice) => i.customer?.id ?? i.customer_id ?? -1;
const invCustomerName = (i: MocoInvoice) => i.customer?.name ?? "Ohne Kunde";

const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM

export interface RevenueCockpit {
  monthNet: number;
  ytdNet: number;
  invoiceCount: number; // gestellte Rechnungen im Monat
  trend: { label: string; net: number }[]; // letzte 6 Monate inkl. gewähltem
}

export interface InvoiceStatus {
  open: { count: number; net: number };
  overdue: { count: number; net: number };
  paidMonth: { count: number; net: number };
}

export interface SalesPipeline {
  openVolume: number;
  openCount: number;
  avgOffer: number;
  acceptedVolume: number;
  winRatePct: number;
}

export interface MarginRow {
  id: number;
  name: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
}

export interface FinanceReport {
  hasRates: boolean;
  revenue: RevenueCockpit;
  invoiceStatus: InvoiceStatus;
  pipeline: SalesPipeline | null;
  customerMargins: MarginRow[];
  projectMargins: MarginRow[];
  avgMarginPct: number;
  wipProjects: { id: number; name: string; customerName: string; billableHours: number }[];
}

const MONTHS_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

export function calcFinance(
  invoices: MocoInvoice[],
  offers: MocoOffer[],
  activities: MocoActivity[], // gewählter Monat, alle MA
  projects: Map<number, MocoProject>,
  hourlyCost: (userId: number) => number, // einheitliche Stundenkosten (Lohn oder Fallback)
  year: number,
  month: number,
  now: Date = new Date()
): FinanceReport {
  const pad = (n: number) => String(n).padStart(2, "0");
  const selKey = `${year}-${pad(month)}`;
  const yearStart = `${year}-01-01`;
  const monthEnd = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;
  const todayISO = now.toISOString().slice(0, 10);

  // --- Umsatz ---
  let monthNet = 0;
  let ytdNet = 0;
  let invoiceCount = 0;
  const byMonth = new Map<string, number>();
  for (const inv of invoices) {
    if (!isIssued(inv)) continue;
    const net = netOf(inv);
    const mk = monthKey(inv.date);
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + net);
    if (mk === selKey) {
      monthNet += net;
      invoiceCount++;
    }
    if (inv.date >= yearStart && inv.date <= monthEnd) ytdNet += net;
  }
  // Trend: 6 Monate bis zum gewählten Monat
  const trend: { label: string; net: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const mk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    trend.push({ label: MONTHS_SHORT[d.getMonth()], net: r0(byMonth.get(mk) ?? 0) });
  }

  // --- Rechnungsstatus (über das gesamte geladene Fenster) ---
  let openCount = 0, openNet = 0, overdueCount = 0, overdueNet = 0, paidCount = 0, paidNet = 0;
  for (const inv of invoices) {
    if (!isIssued(inv)) continue;
    const net = netOf(inv);
    if (!isPaid(inv)) { openCount++; openNet += net; }
    if (isOverdue(inv, todayISO)) { overdueCount++; overdueNet += net; }
    if (isPaid(inv) && monthKey(inv.date) === selKey) { paidCount++; paidNet += net; }
  }

  // --- Pipeline (Offerten) ---
  let pipeline: SalesPipeline | null = null;
  if (offers.length) {
    const open = offers.filter((o) => ["created", "sent"].includes((o.status ?? "").toLowerCase()));
    const accepted = offers.filter((o) => ["accepted", "partially_billed", "billed"].includes((o.status ?? "").toLowerCase()));
    const considered = offers.filter((o) => (o.status ?? "").toLowerCase() !== "archived");
    const openVolume = open.reduce((s, o) => s + netOfOffer(o), 0);
    const acceptedVolume = accepted.reduce((s, o) => s + netOfOffer(o), 0);
    const avgOffer = considered.length ? considered.reduce((s, o) => s + netOfOffer(o), 0) / considered.length : 0;
    pipeline = {
      openVolume: r0(openVolume),
      openCount: open.length,
      avgOffer: r0(avgOffer),
      acceptedVolume: r0(acceptedVolume),
      winRatePct: pct(accepted.length, accepted.length + open.length),
    };
  }

  // --- Margen (Monat): Umsatz aus Rechnungen − Personalkosten aus Stunden×Satz ---
  let hasRates = false;

  // Personalkosten je Kunde/Projekt aus den Monatsaktivitäten
  const costByCustomer = new Map<number, number>();
  const costByProject = new Map<number, number>();
  const billableHoursByProject = new Map<number, number>();
  for (const a of activities) {
    const rate = hourlyCost(a.user.id);
    if (rate > 0) hasRates = true;
    const cost = a.hours * rate;
    costByProject.set(a.project.id, (costByProject.get(a.project.id) ?? 0) + cost);
    const custId = projects.get(a.project.id)?.customer?.id ?? -1;
    costByCustomer.set(custId, (costByCustomer.get(custId) ?? 0) + cost);
    if (a.billable) billableHoursByProject.set(a.project.id, (billableHoursByProject.get(a.project.id) ?? 0) + a.hours);
  }

  // Umsatz je Kunde/Projekt aus Monatsrechnungen
  const revByCustomer = new Map<number, { name: string; net: number }>();
  const revByProject = new Map<number, number>();
  const invoicedProjectIds = new Set<number>();
  for (const inv of invoices) {
    if (!isIssued(inv) || monthKey(inv.date) !== selKey) continue;
    const net = netOf(inv);
    const cid = invCustomerId(inv);
    const cur = revByCustomer.get(cid) ?? { name: invCustomerName(inv), net: 0 };
    cur.net += net;
    revByCustomer.set(cid, cur);
    if (inv.project_id) {
      revByProject.set(inv.project_id, (revByProject.get(inv.project_id) ?? 0) + net);
      invoicedProjectIds.add(inv.project_id);
    }
  }

  const customerMargins = buildMargins(
    new Set([...revByCustomer.keys(), ...costByCustomer.keys()]),
    (id) => revByCustomer.get(id)?.net ?? 0,
    (id) => costByCustomer.get(id) ?? 0,
    (id) => revByCustomer.get(id)?.name ?? projectsCustomerName(projects, id) ?? `Kunde #${id}`
  );

  const projectMargins = buildMargins(
    new Set([...revByProject.keys(), ...costByProject.keys()]),
    (id) => revByProject.get(id) ?? 0,
    (id) => costByProject.get(id) ?? 0,
    (id) => projects.get(id)?.name ?? `Projekt #${id}`
  );

  const totRev = customerMargins.reduce((s, m) => s + m.revenue, 0);
  const totMargin = customerMargins.reduce((s, m) => s + m.margin, 0);

  // WIP: aktive Projekte mit verrechenbaren Stunden, aber ohne Rechnung im Monat
  const wipProjects = [...billableHoursByProject.entries()]
    .filter(([pid]) => !invoicedProjectIds.has(pid))
    .map(([pid, hrs]) => ({
      id: pid,
      name: projects.get(pid)?.name ?? `Projekt #${pid}`,
      customerName: projects.get(pid)?.customer?.name ?? "—",
      billableHours: r1(hrs),
    }))
    .sort((a, b) => b.billableHours - a.billableHours)
    .slice(0, 20);

  return {
    hasRates,
    revenue: { monthNet: r0(monthNet), ytdNet: r0(ytdNet), invoiceCount, trend },
    invoiceStatus: {
      open: { count: openCount, net: r0(openNet) },
      overdue: { count: overdueCount, net: r0(overdueNet) },
      paidMonth: { count: paidCount, net: r0(paidNet) },
    },
    pipeline,
    customerMargins: customerMargins.sort((a, b) => b.margin - a.margin),
    projectMargins: projectMargins.sort((a, b) => b.margin - a.margin),
    avgMarginPct: pct(totMargin, totRev),
    wipProjects,
  };
}

function buildMargins(
  ids: Set<number>,
  rev: (id: number) => number,
  cost: (id: number) => number,
  name: (id: number) => string
): MarginRow[] {
  const out: MarginRow[] = [];
  for (const id of ids) {
    if (id < 0) continue;
    const revenue = r0(rev(id));
    const c = r0(cost(id));
    const margin = revenue - c;
    out.push({ id, name: name(id), revenue, cost: c, margin, marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : 0 });
  }
  return out;
}

function projectsCustomerName(projects: Map<number, MocoProject>, customerId: number): string | undefined {
  for (const p of projects.values()) if (p.customer?.id === customerId) return p.customer.name;
  return undefined;
}
