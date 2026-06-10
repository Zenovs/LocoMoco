"use client";

import type { ProductivityResult } from "@/lib/metrics/productivity";

export interface MonthSlot {
  label: string; // z. B. "Mai 2026"
  productivity: ProductivityResult;
}

function Stat({
  title,
  a,
  b,
  unit,
  delta,
}: {
  title: string;
  a: number;
  b: number;
  unit: string;
  delta?: boolean;
}) {
  const diff = Math.round((b - a) * 10) / 10;
  const up = diff > 0;
  const color = !delta ? "var(--plum)" : up ? "#0a7c3e" : diff < 0 ? "#c0145a" : "var(--plum-soft)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, padding: "8px 0" }}>
      <span style={{ textAlign: "right", fontWeight: 800, fontSize: 18, color: "var(--plum)" }}>
        {a}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--plum-soft)" }}>{unit}</span>
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--plum-soft)", textTransform: "uppercase", letterSpacing: ".04em", padding: "0 4px" }}>
        {title}
        {delta && (
          <span style={{ display: "block", color, fontSize: 12 }}>
            {up ? "▲" : diff < 0 ? "▼" : "•"} {Math.abs(diff)}
            {unit}
          </span>
        )}
      </span>
      <span style={{ textAlign: "left", fontWeight: 800, fontSize: 18, color: "var(--plum)" }}>
        {b}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--plum-soft)" }}>{unit}</span>
      </span>
    </div>
  );
}

export default function MonthCompare({ a, b }: { a: MonthSlot; b: MonthSlot }) {
  return (
    <div className="card" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>⚖️</span>
        <h3 style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700, color: "var(--plum)", fontSize: "1.15rem" }}>
          Monatsvergleich
        </h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", marginBottom: 6 }}>
        <span style={{ textAlign: "right", fontWeight: 700, color: "var(--hotpink)" }}>{a.label}</span>
        <span style={{ width: 70 }} />
        <span style={{ textAlign: "left", fontWeight: 700, color: "var(--hotpink)" }}>{b.label}</span>
      </div>

      <Stat title="Produktivität" a={a.productivity.productivityPct} b={b.productivity.productivityPct} unit="%" delta />
      <div style={{ height: 1, background: "rgba(255,143,208,.25)" }} />
      <Stat title="Verrechenbar" a={a.productivity.billableHours} b={b.productivity.billableHours} unit="h" delta />
      <div style={{ height: 1, background: "rgba(255,143,208,.25)" }} />
      <Stat title="Total gebucht" a={a.productivity.totalHours} b={b.productivity.totalHours} unit="h" delta />
      <div style={{ height: 1, background: "rgba(255,143,208,.25)" }} />
      <Stat title="Intern" a={a.productivity.internalHours} b={b.productivity.internalHours} unit="h" delta />
    </div>
  );
}
