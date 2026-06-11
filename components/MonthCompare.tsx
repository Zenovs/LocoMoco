"use client";

import type { ProductivityResult } from "@/lib/metrics/productivity";

export interface MonthSlot {
  label: string; // z. B. "Mai 2026"
  productivity: ProductivityResult;
}

const COLOR_A = "var(--hotpink)"; // Akzent – Monat A
const COLOR_B = "var(--lilac)";   // Akzent-2 – Monat B

function DeltaChip({ diff, unit }: { diff: number; unit: string }) {
  const rounded = Math.round(diff * 10) / 10;
  const up = rounded > 0;
  const flat = rounded === 0;
  const bg = flat ? "rgba(150,130,160,.12)" : up ? "rgba(10,124,62,.12)" : "rgba(192,20,90,.12)";
  const color = flat ? "var(--plum-soft)" : up ? "#0a7c3e" : "#c0145a";
  return (
    <span style={{ background: bg, color, fontWeight: 800, fontSize: 12.5, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {flat ? "•" : up ? "▲" : "▼"} {Math.abs(rounded)}{unit}
    </span>
  );
}

function MetricGroup({
  title,
  a,
  b,
  unit,
  labelA,
  labelB,
}: {
  title: string;
  a: number;
  b: number;
  unit: string;
  labelA: string;
  labelB: string;
}) {
  const max = Math.max(a, b, unit === "%" ? 100 : 1);
  const pct = (v: number) => Math.max(2, Math.round((v / max) * 100));
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 13.5, color: "var(--plum)", letterSpacing: ".01em" }}>{title}</span>
        <DeltaChip diff={b - a} unit={unit} />
      </div>

      {[{ v: a, c: COLOR_A, l: labelA }, { v: b, c: COLOR_B, l: labelB }].map((row, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i === 0 ? 7 : 0 }}>
          <span style={{ width: 70, fontSize: 11, fontWeight: 700, color: "var(--plum-soft)", textAlign: "right", flexShrink: 0 }}>
            {row.l}
          </span>
          <div style={{ flex: 1, height: 22, borderRadius: 999, background: "var(--bar-bg)", position: "relative", overflow: "hidden" }}>
            <div
              style={{
                width: `${pct(row.v)}%`,
                height: "100%",
                borderRadius: 999,
                background: row.c,
                transition: "width .5s cubic-bezier(.22,1,.36,1)",
              }}
            />
          </div>
          <span style={{ width: 58, fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 14, color: "var(--plum)", flexShrink: 0 }}>
            {row.v}{unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MonthCompare({ a, b }: { a: MonthSlot; b: MonthSlot }) {
  return (
    <div className="card" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚖️</span>
          <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--plum)", fontSize: "1.15rem" }}>
            Monatsvergleich
          </h3>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12.5, fontWeight: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--plum)" }}>
            <span style={{ width: 11, height: 11, borderRadius: 4, background: COLOR_A }} /> {a.label}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--plum)" }}>
            <span style={{ width: 11, height: 11, borderRadius: 4, background: COLOR_B }} /> {b.label}
          </span>
        </div>
      </div>

      <MetricGroup title="Produktivität" a={a.productivity.productivityPct} b={b.productivity.productivityPct} unit="%" labelA={a.label.split(" ")[0]} labelB={b.label.split(" ")[0]} />
      <MetricGroup title="Verrechenbare Stunden" a={a.productivity.billableHours} b={b.productivity.billableHours} unit="h" labelA={a.label.split(" ")[0]} labelB={b.label.split(" ")[0]} />
      <MetricGroup title="Total gebucht" a={a.productivity.totalHours} b={b.productivity.totalHours} unit="h" labelA={a.label.split(" ")[0]} labelB={b.label.split(" ")[0]} />
      <MetricGroup title="Interne Stunden" a={a.productivity.internalHours} b={b.productivity.internalHours} unit="h" labelA={a.label.split(" ")[0]} labelB={b.label.split(" ")[0]} />
    </div>
  );
}
