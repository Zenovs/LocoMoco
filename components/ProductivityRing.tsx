"use client";

import { useState } from "react";
import type { ProductivityResult } from "@/lib/metrics/productivity";
import { useIcon } from "./ThemeContext";

interface Props {
  productivity: ProductivityResult;
  delta: number;
  userName: string;
  month: string;
  year: number;
  target: number | null;
  onSetTarget: (value: number | null) => void;
}

export default function ProductivityRing({ productivity, delta, userName, month, year, target, onSetTarget }: Props) {
  const pct = Math.min(Math.max(productivity.productivityPct, 0), 100);
  const deltaSign = delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "";
  const deltaPositive = delta >= 0;
  const belowTarget = target !== null && productivity.productivityPct < target;
  const ic = useIcon();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(target ?? 75));

  function save() {
    const v = Number(draft);
    onSetTarget(Number.isFinite(v) && v > 0 ? Math.min(100, Math.round(v)) : null);
    setEditing(false);
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>
        {ic("productivity")} Monatliche Produktivität
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 20 }}>
        verrechenbare ÷ erfasste Stunden · {month} {year}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 30, flexWrap: "wrap" }}>
        {/* Conic-gradient ring */}
        <div
          style={{
            flexShrink: 0,
            width: 168,
            height: 168,
            borderRadius: "50%",
            background: `conic-gradient(from 220deg, var(--hotpink) 0%, var(--lilac) ${pct * 1.4 * 0.72}%, var(--bar-bg) ${pct * 1.4 * 0.72}%, var(--bar-bg) 100%)`,
            display: "grid",
            placeItems: "center",
            position: "relative",
            boxShadow: "0 0 0 10px rgba(255,255,255,.55), 0 14px 30px -10px var(--glow)",
          }}
        >
          {/* inner white circle */}
          <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "var(--ring-inner)" }} />
          {/* value */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: 46,
              background: "var(--holo)",
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
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600, color: "var(--plum-soft)" }}>
            {belowTarget
              ? `${userName} liegt unter dem Mindestziel 💪`
              : target !== null
              ? `${userName} hat das Ziel erreicht — top! 🌟`
              : `${userName} war diesen Monat ein richtiger Star 🌟`}
          </p>

          {belowTarget && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, marginRight: 8, background: "#fff0f3", color: "#c0145a", fontWeight: 800, fontFamily: "var(--font-heading)", padding: "6px 13px", borderRadius: 999, fontSize: 13, border: "1.5px solid #ffd0d8" }}>
              ⚠️ {target! - productivity.productivityPct}% unter Ziel ({target}%)
            </div>
          )}

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
                fontFamily: "var(--font-heading)",
                padding: "6px 13px",
                borderRadius: 999,
                fontSize: 13,
                border: `1.5px solid ${deltaPositive ? "#b6f0d8" : "#ffd0d8"}`,
              }}
            >
              {deltaSign}{Math.abs(delta)}% vs. Vormonat
            </div>
          )}

          <div style={{ display: "flex", gap: 22, marginTop: 20, flexWrap: "wrap" }}>
            <div>
              <span style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 24, color: "var(--hotpink)" }}>
                {productivity.billableHours}h
              </span>
              <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>verrechenbar</span>
            </div>
            <div>
              <span style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 24, color: "var(--plum)" }}>
                {productivity.totalHours}h
              </span>
              <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>erfasst</span>
            </div>
            {productivity.targetHours !== null && (
              <div>
                <span style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 24, color: "var(--periwinkle)" }}>
                  {productivity.targetHours}h
                </span>
                <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>
                  Soll (Pensum){productivity.absenceHours > 0 ? ` · −${productivity.absenceHours}h Ferien/Krankheit` : ""}
                </span>
              </div>
            )}
            <div>
              <span style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 24, color: "var(--lilac)" }}>
                {productivity.internalHours}h
              </span>
              <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>intern</span>
            </div>
          </div>


          {/* Mindestziel festlegen / bearbeiten */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {editing ? (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--plum-soft)" }}>{ic("target")} Mindestziel</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
                  style={{ width: 64, padding: "5px 8px", borderRadius: 10, border: "1.5px solid #ffc4e3", fontWeight: 700, fontFamily: "var(--font-body)", color: "var(--plum)", outline: "none" }}
                />
                <span style={{ fontWeight: 700, color: "var(--plum-soft)" }}>%</span>
                <button onClick={save} className="chip" style={{ padding: "5px 11px" }}>✓ Speichern</button>
                <button onClick={() => setEditing(false)} className="chip" style={{ padding: "5px 11px" }}>✕</button>
              </>
            ) : (
              <button
                onClick={() => { setDraft(String(target ?? 75)); setEditing(true); }}
                className="chip"
                style={{ fontWeight: 700 }}
              >
                {ic("target")} {target !== null ? `Mindestziel: ${target}% · ✏️ ändern` : "Mindestziel festlegen"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
