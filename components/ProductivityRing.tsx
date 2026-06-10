"use client";

import type { ProductivityResult } from "@/lib/metrics/productivity";

interface Props {
  productivity: ProductivityResult;
  delta: number;
  userName: string;
  month: string;
  year: number;
}

export default function ProductivityRing({ productivity, delta, userName, month, year }: Props) {
  const pct = Math.min(Math.max(productivity.productivityPct, 0), 100);
  const deltaSign = delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "";
  const deltaPositive = delta >= 0;

  return (
    <section className="card">
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>
        💖 Monatliche Produktivität
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 20 }}>
        verrechenbare Stunden ÷ Sollstunden · {month} {year}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 30, flexWrap: "wrap" }}>
        {/* Conic-gradient ring */}
        <div
          style={{
            flexShrink: 0,
            width: 168,
            height: 168,
            borderRadius: "50%",
            background: `conic-gradient(from 220deg, #ff2e95 0%, #c9a7ff ${pct * 1.4 * 0.72}%, #ffe3f1 ${pct * 1.4 * 0.72}%, #ffe3f1 100%)`,
            display: "grid",
            placeItems: "center",
            position: "relative",
            boxShadow: "0 0 0 10px rgba(255,255,255,.55), 0 14px 30px -10px rgba(201,167,255,.7)",
          }}
        >
          {/* inner white circle */}
          <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "#fff" }} />
          {/* value */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: "Fredoka, sans-serif",
              fontWeight: 700,
              fontSize: 46,
              background: "linear-gradient(110deg,#ff8fd0 0%,#c9a7ff 30%,#a9d8ff 55%,#ffd86b 78%,#ff8fd0 100%)",
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "shimmer 5s ease-in-out infinite",
            }}
          >
            {pct}
            <span style={{ fontSize: 20 }}>%</span>
          </div>
        </div>

        {/* Meta */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{ fontFamily: "Fredoka, sans-serif", fontSize: 15, fontWeight: 600, color: "var(--plum-soft)" }}>
            {userName} war diesen Monat ein richtiger Star 🌟
          </p>

          {delta !== 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                background: deltaPositive ? "#e8fff4" : "#fff0f3",
                color: deltaPositive ? "#15936b" : "#c0145a",
                fontWeight: 700,
                fontFamily: "Fredoka, sans-serif",
                padding: "6px 13px",
                borderRadius: 999,
                fontSize: 13,
                border: `1.5px solid ${deltaPositive ? "#b6f0d8" : "#ffd0d8"}`,
              }}
            >
              {deltaSign}{Math.abs(delta)}% vs. Vormonat
            </div>
          )}

          <div style={{ display: "flex", gap: 26, marginTop: 20, flexWrap: "wrap" }}>
            <div>
              <span style={{ display: "block", fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 24, color: "var(--hotpink)" }}>
                {productivity.billableHours}h
              </span>
              <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>verrechenbar</span>
            </div>
            {productivity.targetHours !== null ? (
              <div>
                <span style={{ display: "block", fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 24, color: "var(--plum)" }}>
                  {productivity.targetHours}h
                </span>
                <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>Soll</span>
              </div>
            ) : (
              <div>
                <span style={{ display: "block", fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 24, color: "var(--plum)" }}>
                  {productivity.totalHours}h
                </span>
                <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>total erfasst*</span>
              </div>
            )}
            <div>
              <span style={{ display: "block", fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 24, color: "var(--lilac)" }}>
                {productivity.internalHours}h
              </span>
              <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>intern</span>
            </div>
          </div>

          {productivity.label === "total" && (
            <p style={{ fontSize: 11, color: "var(--plum-soft)", marginTop: 8, opacity: 0.7 }}>
              * Kein Stellengrad gefunden — Verhältnis zu Total.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
