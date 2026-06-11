"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CompanyReport,
  ProjectProfit,
  EmployeePerf,
  CustomerEcon,
} from "@/lib/metrics/company";
import type { FinanceReport, MarginRow } from "@/lib/metrics/finance";

const h = (n: number) => `${n.toLocaleString("de-CH", { maximumFractionDigits: 1 })} h`;
const p = (n: number) => `${n} %`;
const chf = (n: number) => `${n.toLocaleString("de-CH", { maximumFractionDigits: 0 })} CHF`;

// ---------------------------------------------------------------------------
// Sektion: lädt /api/company einmal und rendert die freigegebenen Firmen-Karten.
// ---------------------------------------------------------------------------
export default function CompanySection({
  year,
  month,
  refreshTick,
  showCard,
}: {
  year: number;
  month: number;
  refreshTick: number;
  showCard: (key: string) => boolean;
}) {
  const keys = [
    "gl.auslastung",
    "gl.umsatz",
    "gl.rechnungen",
    "gl.wip",
    "gl.vertrieb",
    "gl.margen",
    "prj.rentabilitaet",
    "prj.rangliste",
    "prj.status",
    "hr.leistung",
    "hr.rangliste",
    "kd.wirtschaft",
    "kd.rangliste",
  ];
  const anyEnabled = keys.some(showCard);

  const [data, setData] = useState<CompanyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reqRef = useRef(0);

  useEffect(() => {
    if (!anyEnabled) return;
    const myReq = ++reqRef.current;
    setLoading(true);
    setError("");
    fetch(`/api/company?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d: CompanyReport & { error?: string }) => {
        if (myReq !== reqRef.current) return;
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => { if (myReq === reqRef.current) setError("Firmendaten konnten nicht geladen werden."); })
      .finally(() => { if (myReq === reqRef.current) setLoading(false); });
  }, [year, month, refreshTick, anyEnabled]);

  if (!anyEnabled) return null;

  return (
    <section style={{ marginTop: 30 }}>
      <SectionHeading />
      {loading && (
        <div className="card" style={{ textAlign: "center", color: "var(--hotpink)", fontWeight: 600 }}>
          Firmenzahlen werden geladen… 💫
        </div>
      )}
      {error && (
        <div className="card" style={{ color: "#c0145a", fontWeight: 600 }}>{error}</div>
      )}
      {!loading && data && (
        <div style={{ display: "grid", gap: 22 }}>
          {showCard("gl.auslastung") && <UtilizationCard d={data} />}
          {(showCard("gl.umsatz") || showCard("gl.rechnungen")) && (
            <div style={{ display: "grid", gridTemplateColumns: showCard("gl.umsatz") && showCard("gl.rechnungen") ? "1.4fr 1fr" : "1fr", gap: 22 }} className="responsive-grid">
              {showCard("gl.umsatz") && <RevenueCard f={data.finance} />}
              {showCard("gl.rechnungen") && <InvoiceStatusCard f={data.finance} />}
            </div>
          )}
          {showCard("gl.vertrieb") && <PipelineCard f={data.finance} />}
          {showCard("gl.wip") && <WipCard f={data.finance} />}
          {showCard("prj.status") && <ProjectStatusCard d={data} />}
          {(showCard("hr.leistung") || showCard("hr.rangliste")) && (
            <div style={{ display: "grid", gridTemplateColumns: showCard("hr.leistung") && showCard("hr.rangliste") ? "1.4fr 1fr" : "1fr", gap: 22 }} className="responsive-grid">
              {showCard("hr.leistung") && <EmployeeCard rows={data.employees} />}
              {showCard("hr.rangliste") && <TeamRankingCard rows={data.employees} />}
            </div>
          )}
          {showCard("prj.rentabilitaet") && <ProjectProfitCard rows={data.projects} />}
          {showCard("prj.rangliste") && <ProjectRankingCard rows={data.projects} />}
          {(showCard("kd.wirtschaft") || showCard("kd.rangliste")) && (
            <div style={{ display: "grid", gridTemplateColumns: showCard("kd.wirtschaft") && showCard("kd.rangliste") ? "1.4fr 1fr" : "1fr", gap: 22 }} className="responsive-grid">
              {showCard("kd.wirtschaft") && <CustomerCard rows={data.customers} />}
              {showCard("kd.rangliste") && <CustomerRankingCard rows={data.customers} />}
            </div>
          )}
          {showCard("gl.margen") && <MarginCard f={data.finance} />}
        </div>
      )}
    </section>
  );
}

function SectionHeading() {
  return (
    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, color: "var(--plum)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
      <span>🏢</span> Firmenweite Auswertung
    </h2>
  );
}

function CardTitle({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 17, color: "var(--plum)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{icon}</span> {title}
      </h3>
      {hint && <p style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600, margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

// Mini-Balken für Prozentwerte
function Bar({ value, color = "var(--hotpink)" }: { value: number; color?: string }) {
  return (
    <div style={{ height: 8, background: "var(--bar-bg)", borderRadius: 99, overflow: "hidden", minWidth: 60 }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: color, borderRadius: 99 }} />
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ flex: "1 1 130px", minWidth: 120 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--plum-soft)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 30, lineHeight: 1.1, color: color ?? "var(--plum)" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 600, color: "var(--plum-soft)" }}>{sub}</div>}
    </div>
  );
}

// === gl.auslastung ===
function UtilizationCard({ d }: { d: CompanyReport }) {
  const u = d.utilization;
  return (
    <div className="card">
      <CardTitle icon="📊" title="Auslastung & Verrechenbarkeit" hint={`${u.headcount} aktive Mitarbeitende`} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
        <Stat label="Erfasst" value={h(u.totalHours)} sub={`Soll ${h(u.sollHours)}`} />
        <Stat label="Auslastung" value={p(u.utilizationPct)} sub="erfasst ÷ Soll" color="var(--hotpink)" />
        <Stat label="Verrechenbar" value={h(u.billableHours)} sub={`intern ${h(u.internalHours)}`} />
        <Stat label="Verrechenbarkeit" value={p(u.billablePct)} sub="verr. ÷ erfasst" color="var(--hotpink)" />
        <Stat label="Verr. vom Soll" value={p(u.billableOfSollPct)} sub="verr. ÷ Soll" />
      </div>
    </div>
  );
}

// === prj.status ===
function ProjectStatusCard({ d }: { d: CompanyReport }) {
  const s = d.projectStatus;
  return (
    <div className="card">
      <CardTitle icon="🚦" title="Projektstatus" hint={`${s.active} aktive Projekte`} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
        <Stat label="Aktiv" value={String(s.active)} />
        <Stat label="Über Budget" value={String(s.overBudget)} color={s.overBudget ? "#c0145a" : "var(--plum)"} />
        <Stat label="Budget ≥ 80 %" value={String(s.nearBudget)} color={s.nearBudget ? "#c97a00" : "var(--plum)"} />
        <Stat label="30 T ohne Aktivität" value={String(s.noActivity30)} />
        <Stat label="Termin überschritten" value={String(s.overdue)} color={s.overdue ? "#c0145a" : "var(--plum)"} />
      </div>
    </div>
  );
}

// === hr.leistung ===
function EmployeeCard({ rows }: { rows: EmployeePerf[] }) {
  return (
    <div className="card">
      <CardTitle icon="🧑‍💼" title="Mitarbeiterleistung" hint="Stunden & Verrechenbarkeit diesen Monat" />
      <Table
        head={["Mitarbeiter", "Erfasst", "Verr.", "Verr.-Quote", "Auslastung"]}
        align={["left", "right", "right", "left", "right"]}
        rows={rows.map((e) => [
          e.name,
          h(e.totalHours),
          h(e.billableHours),
          <div key="b" style={{ display: "flex", alignItems: "center", gap: 8 }}><Bar value={e.billablePct} /><span style={{ fontWeight: 700, minWidth: 38 }}>{p(e.billablePct)}</span></div>,
          e.sollHours > 0 ? p(e.utilizationPct) : "—",
        ])}
      />
    </div>
  );
}

// === hr.rangliste ===
function TeamRankingCard({ rows }: { rows: EmployeePerf[] }) {
  const top = [...rows].filter((r) => r.totalHours >= 1).sort((a, b) => b.billablePct - a.billablePct).slice(0, 5);
  return (
    <div className="card">
      <CardTitle icon="🏆" title="Team-Rangliste" hint="Top nach Verrechenbarkeit" />
      <Ranking items={top.map((r, i) => ({ rank: i + 1, name: r.name, value: p(r.billablePct), bar: r.billablePct }))} />
    </div>
  );
}

// === prj.rentabilitaet ===
function ProjectProfitCard({ rows }: { rows: ProjectProfit[] }) {
  const list = [...rows].sort((a, b) => b.hoursTotal - a.hoursTotal).slice(0, 25);
  return (
    <div className="card">
      <CardTitle icon="📁" title="Projekt-Rentabilität" hint="Budget, Fortschritt & Verrechenbarkeit · CHF/Marge folgen mit Kostensätzen" />
      <Table
        head={["Projekt", "Kunde", "Stunden", "Budget", "Fortschritt", "Verr."]}
        align={["left", "left", "right", "right", "left", "right"]}
        rows={list.map((pr) => [
          pr.projectName,
          pr.customerName,
          h(pr.hoursTotal),
          pr.hasBudget ? h(pr.budgetHours) : "—",
          pr.hasBudget ? (
            <div key="p" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bar value={pr.progressPct} color={pr.progressPct > 100 ? "#c0145a" : pr.progressPct >= 80 ? "#c97a00" : "var(--hotpink)"} />
              <span style={{ fontWeight: 700, minWidth: 42, color: pr.progressPct > 100 ? "#c0145a" : "var(--plum)" }}>{p(pr.progressPct)}</span>
            </div>
          ) : <span key="p" style={{ color: "var(--plum-soft)" }}>kein Budget</span>,
          p(pr.billablePct),
        ])}
      />
    </div>
  );
}

// === prj.rangliste ===
function ProjectRankingCard({ rows }: { rows: ProjectProfit[] }) {
  const over = rows.filter((r) => r.hoursOver > 0).sort((a, b) => b.hoursOver - a.hoursOver).slice(0, 5);
  const busy = [...rows].sort((a, b) => b.monthHours - a.monthHours).filter((r) => r.monthHours > 0).slice(0, 5);
  return (
    <div className="card">
      <CardTitle icon="📈" title="Projekt-Ranglisten" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }} className="responsive-grid">
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--plum-soft)", marginBottom: 8 }}>Grösste Budgetüberschreitung</div>
          {over.length ? (
            <Ranking items={over.map((r, i) => ({ rank: i + 1, name: r.projectName, value: `+${h(r.hoursOver)}`, valueColor: "#c0145a" }))} />
          ) : <Empty text="Kein Projekt über Budget 🎉" />}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--plum-soft)", marginBottom: 8 }}>Meiste Stunden (Monat)</div>
          {busy.length ? (
            <Ranking items={busy.map((r, i) => ({ rank: i + 1, name: r.projectName, value: h(r.monthHours) }))} />
          ) : <Empty text="Keine Buchungen diesen Monat" />}
        </div>
      </div>
    </div>
  );
}

// === kd.wirtschaft ===
function CustomerCard({ rows }: { rows: CustomerEcon[] }) {
  const list = rows.slice(0, 25);
  return (
    <div className="card">
      <CardTitle icon="🤝" title="Kunden-Wirtschaftlichkeit" hint="Aufwand & Verrechenbarkeit diesen Monat" />
      <Table
        head={["Kunde", "Projekte", "Stunden", "Verr.", "Verr.-Quote"]}
        align={["left", "right", "right", "right", "left"]}
        rows={list.map((c) => [
          c.customerName,
          String(c.projectCount),
          h(c.totalHours),
          h(c.billableHours),
          <div key="b" style={{ display: "flex", alignItems: "center", gap: 8 }}><Bar value={c.billablePct} /><span style={{ fontWeight: 700, minWidth: 38 }}>{p(c.billablePct)}</span></div>,
        ])}
      />
    </div>
  );
}

// === kd.rangliste ===
function CustomerRankingCard({ rows }: { rows: CustomerEcon[] }) {
  const top = rows.slice(0, 5);
  return (
    <div className="card">
      <CardTitle icon="🥇" title="Kunden-Ranglisten" hint="Top nach Aufwand" />
      <Ranking items={top.map((r, i) => ({ rank: i + 1, name: r.customerName, value: h(r.totalHours) }))} />
    </div>
  );
}

// Hinweis, wenn der Finanzteil (Rechnungen/Offerten) nicht verfügbar ist.
function FinanceUnavailable({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="card">
      <CardTitle icon={icon} title={title} />
      <Empty text="Keine Rechnungs-/Offertendaten verfügbar — entweder hat der MOCO-Key keinen Zugriff auf diese Module, oder es gibt im Zeitraum keine Daten." />
    </div>
  );
}

// === gl.umsatz ===
function RevenueCard({ f }: { f: FinanceReport | null }) {
  if (!f) return <FinanceUnavailable icon="💰" title="Umsatz-Cockpit" />;
  const max = Math.max(1, ...f.revenue.trend.map((t) => t.net));
  return (
    <div className="card">
      <CardTitle icon="💰" title="Umsatz-Cockpit" hint="fakturiert (netto)" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 16 }}>
        <Stat label="Dieser Monat" value={chf(f.revenue.monthNet)} sub={`${f.revenue.invoiceCount} Rechnungen`} color="var(--hotpink)" />
        <Stat label="Jahr bisher" value={chf(f.revenue.ytdNet)} sub="seit Januar" />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 84 }}>
        {f.revenue.trend.map((t, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: "100%", height: 60, display: "flex", alignItems: "flex-end" }}>
              <div title={chf(t.net)} style={{ width: "100%", height: `${Math.max(3, (t.net / max) * 100)}%`, background: "var(--hotpink)", borderRadius: "6px 6px 0 0", opacity: i === f.revenue.trend.length - 1 ? 1 : 0.55 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--plum-soft)" }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// === gl.rechnungen ===
function InvoiceStatusCard({ f }: { f: FinanceReport | null }) {
  if (!f) return <FinanceUnavailable icon="🧾" title="Rechnungsstatus" />;
  const s = f.invoiceStatus;
  return (
    <div className="card">
      <CardTitle icon="🧾" title="Rechnungsstatus" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <StatusRow label="Offen (unbezahlt)" count={s.open.count} value={chf(s.open.net)} />
        <StatusRow label="Überfällig" count={s.overdue.count} value={chf(s.overdue.net)} color="#c0145a" />
        <StatusRow label="Bezahlt (Monat)" count={s.paidMonth.count} value={chf(s.paidMonth.net)} color="#0a8a4a" />
      </div>
    </div>
  );
}
function StatusRow({ label, count, value, color }: { label: string; count: number; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontWeight: 700, color: "var(--plum)" }}>{label} <span style={{ color: "var(--plum-soft)", fontWeight: 600 }}>· {count}</span></span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: color ?? "var(--plum)" }}>{value}</span>
    </div>
  );
}

// === gl.vertrieb ===
function PipelineCard({ f }: { f: FinanceReport | null }) {
  if (!f || !f.pipeline) return <FinanceUnavailable icon="🎯" title="Vertrieb / Pipeline" />;
  const pl = f.pipeline;
  return (
    <div className="card">
      <CardTitle icon="🎯" title="Vertrieb / Pipeline" hint="aus den Offerten" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
        <Stat label="Offenes Volumen" value={chf(pl.openVolume)} sub={`${pl.openCount} offene Offerten`} color="var(--hotpink)" />
        <Stat label="Ø Offertensumme" value={chf(pl.avgOffer)} />
        <Stat label="Angenommen" value={chf(pl.acceptedVolume)} />
        <Stat label="Abschlussquote" value={p(pl.winRatePct)} sub="angenommen ÷ (angen. + offen)" />
      </div>
    </div>
  );
}

// === gl.wip ===
function WipCard({ f }: { f: FinanceReport | null }) {
  if (!f) return <FinanceUnavailable icon="⏳" title="Fakturierbar, nicht verrechnet" />;
  return (
    <div className="card">
      <CardTitle icon="⏳" title="Fakturierbar, nicht verrechnet" hint="aktive Projekte mit verrechenbaren Stunden, aber ohne Rechnung diesen Monat" />
      {f.wipProjects.length ? (
        <Table
          head={["Projekt", "Kunde", "Verr. Stunden"]}
          align={["left", "left", "right"]}
          rows={f.wipProjects.map((w) => [w.name, w.customerName, h(w.billableHours)])}
        />
      ) : <Empty text="Alle verrechenbaren Leistungen sind fakturiert 🎉" />}
    </div>
  );
}

// === gl.margen ===
function MarginCard({ f }: { f: FinanceReport | null }) {
  if (!f) return <FinanceUnavailable icon="📐" title="Margen & Deckungsbeitrag" />;
  if (!f.hasRates) {
    return (
      <div className="card">
        <CardTitle icon="📐" title="Margen & Deckungsbeitrag" />
        <Empty text="Noch keine Kostensätze hinterlegt. In der Benutzerverwaltung → Kostensätze einen Stundensatz (CHF/h) setzen, dann werden Marge und Deckungsbeitrag berechnet." />
      </div>
    );
  }
  const top = [...f.customerMargins].sort((a, b) => b.margin - a.margin).slice(0, 5);
  const bottom = [...f.customerMargins].sort((a, b) => a.margin - b.margin).filter((m) => m.margin < 0).slice(0, 5);
  return (
    <div className="card">
      <CardTitle icon="📐" title="Margen & Deckungsbeitrag" hint="Monat: fakturiert − Personalkosten (Stunden × Satz)" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 14 }}>
        <Stat label="Ø Marge" value={p(f.avgMarginPct)} color={f.avgMarginPct >= 0 ? "#0a8a4a" : "#c0145a"} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--plum-soft)", marginBottom: 8 }}>Deckungsbeitrag pro Kunde (Top)</div>
      <MarginTable rows={top} />
      {bottom.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#c0145a", margin: "14px 0 8px" }}>Negativer Deckungsbeitrag</div>
          <MarginTable rows={bottom} />
        </>
      )}
    </div>
  );
}
function MarginTable({ rows }: { rows: MarginRow[] }) {
  if (!rows.length) return <Empty text="Keine Daten." />;
  return (
    <Table
      head={["Kunde", "Umsatz", "Kosten", "DB", "Marge"]}
      align={["left", "right", "right", "right", "right"]}
      rows={rows.map((m) => [
        m.name,
        chf(m.revenue),
        chf(m.cost),
        <span key="db" style={{ color: m.margin >= 0 ? "#0a8a4a" : "#c0145a", fontWeight: 800 }}>{chf(m.margin)}</span>,
        <span key="mp" style={{ color: m.margin >= 0 ? "var(--plum)" : "#c0145a" }}>{p(m.marginPct)}</span>,
      ])}
    />
  );
}

// ---------------------------------------------------------------------------
// Gemeinsame UI-Helfer
// ---------------------------------------------------------------------------
function Empty({ text }: { text: string }) {
  return <p style={{ color: "var(--plum-soft)", fontWeight: 600, fontSize: 13, margin: "8px 0" }}>{text}</p>;
}

function Ranking({ items }: { items: { rank: number; name: string; value: string; valueColor?: string; bar?: number }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it) => (
        <div key={it.rank} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--hotpink)", minWidth: 22 }}>{it.rank}</span>
          <span style={{ flex: 1, fontWeight: 600, color: "var(--plum)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
          <span style={{ fontWeight: 800, color: it.valueColor ?? "var(--plum)" }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

type Cell = React.ReactNode;
function Table({ head, rows, align }: { head: string[]; rows: Cell[][]; align?: ("left" | "right")[] }) {
  const at = (i: number) => align?.[i] ?? "left";
  if (rows.length === 0) return <Empty text="Keine Daten für diesen Monat." />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {head.map((hd, i) => (
              <th key={i} style={{ textAlign: at(i), padding: "8px 10px", fontSize: 11, fontWeight: 800, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--plum-soft)", borderBottom: "1.5px solid var(--bar-bg)" }}>{hd}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ textAlign: at(ci), padding: "9px 10px", color: "var(--plum)", fontWeight: 600, borderBottom: "1px solid var(--bar-bg)", whiteSpace: ci === 0 ? "normal" : "nowrap" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
