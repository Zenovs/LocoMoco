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

const STYLE: Record<DayStatus, { bg: string; br: string; dot: string; label: string }> = {
  productive: { bg: "#effaf3", br: "#bfead2", dot: "#0a8a4a", label: "produktiv" },
  low: { bg: "#fff7e8", br: "#ffe1a8", dot: "#c97a00", label: "wenig verrechenbar" },
  missing: { bg: "#fff0f5", br: "#ffd0e6", dot: "#c0145a", label: "nichts erfasst" },
  absence: { bg: "#eaf2fb", br: "#c5dcf5", dot: "#3a6ea5", label: "Ferien/Krankheit" },
  off: { bg: "transparent", br: "var(--bar-bg)", dot: "transparent", label: "frei" },
  future: { bg: "transparent", br: "var(--bar-bg)", dot: "transparent", label: "noch offen" },
};

function fmtFull(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" });
}

export default function CalendarCard({ days, year, month, userName }: Props) {
  const [sel, setSel] = useState<string | null>(null);
  const offset = days.length ? days[0].weekday : 0; // Leerzellen vor dem 1.
  const selected = days.find((d) => d.date === sel) ?? null;

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
        🗓️ Kalender — {userName}
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 14 }}>
        {MONTHS[month - 1]} {year} · Farbe = wie produktiv der Tag war · Tag anklicken für Details
      </p>

      {/* Legende */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        {(["productive", "low", "missing", "absence"] as DayStatus[]).map((s) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--plum-soft)" }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: STYLE[s].bg, border: `1.5px solid ${STYLE[s].br}` }} />
            {STYLE[s].label}
          </span>
        ))}
      </div>

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
              title={`${st.label}${d.recorded ? ` · ${d.recorded} h` : ""}`}
              style={{
                aspectRatio: "1 / 1", minHeight: 46, borderRadius: 12, cursor: "pointer",
                background: st.bg, border: `1.5px solid ${isSel ? "var(--hotpink)" : st.br}`,
                boxShadow: isSel ? "0 0 0 2px var(--hotpink)" : "none",
                display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between",
                padding: "6px 8px", textAlign: "left",
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 13, color: "var(--plum)" }}>{d.day}</span>
              {d.recorded > 0 ? (
                <span style={{ fontSize: 10.5, fontWeight: 800, color: st.dot }}>{d.billablePct}%</span>
              ) : d.status === "absence" ? (
                <span style={{ fontSize: 12 }}>🏖️</span>
              ) : d.status === "missing" ? (
                <span style={{ fontSize: 12 }}>⚠️</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tagesdetail */}
      {selected && (
        <div style={{ marginTop: 16, background: "var(--input-bg)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ fontWeight: 800, color: "var(--plum)", fontSize: 15 }}>{fmtFull(selected.date)}</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: STYLE[selected.status].dot, background: STYLE[selected.status].bg, border: `1.5px solid ${STYLE[selected.status].br}`, borderRadius: 999, padding: "3px 10px" }}>
              {STYLE[selected.status].label}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: "var(--plum-soft)" }}>
              {selected.recorded} h erfasst{selected.soll > 0 ? ` · Soll ${selected.soll} h` : ""}{selected.recorded > 0 ? ` · ${selected.billablePct}% verrechenbar` : ""}
            </span>
          </div>
          {selected.entries.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>
              {selected.status === "absence" ? "Abwesenheit (Ferien/Krankheit)." : selected.status === "missing" ? "Keine Zeiterfassung an diesem Arbeitstag." : "Keine Einträge."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selected.entries.map((e, j) => (
                <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--card-bg, #fff)", borderRadius: 10, padding: "8px 11px", border: "1px solid var(--bar-bg)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 9, marginTop: 5, flexShrink: 0, background: e.billable ? "#0a8a4a" : "#c97a00" }} title={e.billable ? "verrechenbar" : "intern"} />
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
