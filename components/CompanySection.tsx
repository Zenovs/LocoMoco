"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CompanyReport,
  ProjectProfit,
  EmployeePerf,
  CustomerEcon,
} from "@/lib/metrics/company";

const h = (n: number) => `${n.toLocaleString("de-CH", { maximumFractionDigits: 1 })} h`;
const p = (n: number) => `${n} %`;

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
