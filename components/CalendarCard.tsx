"use client";

import { useState } from "react";
import type { CalendarDay, DayStatus } from "@/lib/metrics/calendar";

interface Props {
  days: CalendarDay[];
  year: number;
  month: number;
  userName: string;
}

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const BILL = "#0a8a4a"; // verrechenbar (erreichte Produktivität)
const INTERN = "#ffcaa0"; // intern
const TRACK = "var(--bar-bg)";

const STYLE: Record<DayStatus, { tint: string; br: string; label: string; dot: string }> = {
  productive: { tint: "rgba(10,138,74,.06)", br: "#bfead2", label: "Ziel erreicht", dot: "#0a8a4a" },
  low: { tint: "rgba(201,122,0,.06)", br: "#ffe1a8", label: "unter Ziel", dot: "#c97a00" },
  missing: { tint: "rgba(192,20,90,.05)", br: "#ffd0e6", label: "nichts erfasst", dot: "#c0145a" },
  absence: { tint: "rgba(58,110,165,.07)", br: "#c5dcf5", label: "Ferien/Krankheit", dot: "#3a6ea5" },
  off: { tint: "transparent", br: "var(--bar-bg)", label: "frei", dot: "transparent" },
  future: { tint: "transparent", br: "var(--bar-bg)", label: "noch offen", dot: "transparent" },
};

function fmtFull(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" });
}

// Tages-Balken: Track = Soll, grün = verrechenbar, orange = intern, Linie = Ziel.
function DayBar({ d }: { d: CalendarDay }) {
  const base = d.soll > 0 ? d.soll : d.recorded;
  if (base <= 0) return <div style={{ height: 8 }} />;
  const pct = (h: number) => Math.min(100, Math.max(0, (h / base) * 100));
  const billW = pct(d.billable);
  const internW = pct(d.recorded - d.billable);
  const goalLeft = d.goalBillable > 0 ? pct(d.goalBillable) : null;
  return (
    <div style={{ position: "relative", height: 9, borderRadius: 99, background: TRACK, overflow: "hidden", marginTop: "auto" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div style={{ width: `${billW}%`, background: BILL }} />
        <div style={{ width: `${internW}%`, background: INTERN }} />
      </div>
      {goalLeft !== null && (
        <div title={`Ziel: ${d.goalBillable} h verrechenbar`} style={{ position: "absolute", top: -1, bottom: -1, left: `calc(${goalLeft}% - 1px)`, width: 2, background: "var(--plum)", borderRadius: 2 }} />
      )}
    </div>
  );
}

export default function CalendarCard({ days, year, month, userName }: Props) {
  const [sel, setSel] = useState<string | null>(null);
  const offset = days.length ? days[0].weekday : 0;
  const selected = days.find((d) => d.date === sel) ?? null;

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
        🗓️ Kalender — {userName}
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 12 }}>
        {MONTHS[month - 1]} {year} · Balken je Tag: Länge = Soll, <b style={{ color: BILL }}>grün</b> = verrechenbar, <b style={{ color: "#c97a00" }}>orange</b> = intern, <b>│</b> = Produktivitätsziel · Tag anklicken für Details
      </p>

      {/* Wochentage */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
        {WD.map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "var(--plum-soft)", textTransform: "uppercase" }}>{w}</div>
        ))}
      </div>

      {/* Tage */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {days.map((d) => {
          const st = STYLE[d.status];
          const isSel = d.date === sel;
          return (
            <button
              key={d.date}
              onClick={() => setSel(isSel ? null : d.date)}
              title={`${st.label}${d.recorded ? ` · ${d.recorded} h erfasst, ${d.billablePct}% verrechenbar` : ""}`}
              style={{
                minHeight: 62, borderRadius: 12, cursor: "pointer",
                background: st.tint, border: `1.5px solid ${isSel ? "var(--hotpink)" : st.br}`,
                boxShadow: isSel ? "0 0 0 2px var(--hotpink)" : "none",
                display: "flex", flexDirection: "column", gap: 4,
                padding: "6px 8px", textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: "var(--plum)" }}>{d.day}</span>
                {d.recorded > 0 ? (
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: st.dot }}>{d.billablePct}%</span>
                ) : d.status === "absence" ? <span style={{ fontSize: 11 }}>🏖️</span>
                  : d.status === "missing" ? <span style={{ fontSize: 11 }}>⚠️</span> : null}
              </div>
              <DayBar d={d} />
            </button>
          );
        })}
      </div>

      {/* Tagesdetail */}
      {selected && (
        <div style={{ marginTop: 16, background: "var(--input-bg)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ fontWeight: 800, color: "var(--plum)", fontSize: 15 }}>{fmtFull(selected.date)}</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: STYLE[selected.status].dot, border: `1.5px solid ${STYLE[selected.status].br}`, borderRadius: 999, padding: "3px 10px" }}>
              {STYLE[selected.status].label}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: "var(--plum-soft)" }}>
              {selected.recorded} h erfasst{selected.soll > 0 ? ` / Soll ${selected.soll} h` : ""}
              {selected.recorded > 0 ? ` · ${selected.billable} h verrechenbar (${selected.billablePct}%)` : ""}
              {selected.goalBillable > 0 ? ` · Ziel ${selected.goalBillable} h` : ""}
            </span>
          </div>
          {selected.entries.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>
              {selected.status === "absence" ? "Abwesenheit (Ferien/Krankheit)." : selected.status === "missing" ? "Keine Zeiterfassung an diesem Arbeitstag." : "Keine Einträge."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selected.entries.map((e, j) => (
                <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fff", borderRadius: 10, padding: "8px 11px", border: "1px solid var(--bar-bg)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 9, marginTop: 5, flexShrink: 0, background: e.billable ? BILL : "#c97a00" }} title={e.billable ? "verrechenbar" : "intern"} />
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, color: "var(--plum)", fontSize: 13 }}>{e.project}</span>
                    {e.task && <span style={{ fontSize: 11.5, color: "var(--plum-soft)", fontWeight: 600 }}> · {e.task}</span>}
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: e.description ? "var(--plum)" : "var(--plum-soft)", marginTop: 1 }}>
                      {e.description || <span style={{ fontStyle: "italic" }}>ohne Beschreibung</span>}
                    </span>
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--hotpink)", whiteSpace: "nowrap" }}>{e.hours} h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
