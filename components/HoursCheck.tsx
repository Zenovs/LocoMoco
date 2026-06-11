"use client";

import type { HoursCheckResult } from "@/lib/metrics/hoursCheck";

interface Props {
  check: HoursCheckResult;
  userName: string;
}

const TOLERANCE = 1; // h — kleine Abweichungen nicht anmahnen

function fmtDay(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-CH", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}
function fmtFull(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-CH", {
    day: "numeric",
    month: "long",
  });
}

export default function HoursCheck({ check, userName }: Props) {
  if (!check.hasTarget) {
    return (
      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>⏱️ Erfassungs-Check</h2>
        <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>
          Für {userName} ist kein Stellengrad in MOCO hinterlegt — ein Soll-Abgleich ist daher nicht möglich.
        </p>
      </section>
    );
  }

  if (check.asOf === null) {
    return (
      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>⏱️ Erfassungs-Check</h2>
        <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>
          Der Monat hat gerade erst begonnen — noch keine abgeschlossenen Tage zum Prüfen 🌱
        </p>
      </section>
    );
  }

  const behind = check.delta < -TOLERANCE;
  const accent = behind ? "#c0145a" : "#0a7c3e";
  const bg = behind ? "#fff0f5" : "#effaf3";
  const border = behind ? "#ffd0e6" : "#bfead2";

  return (
    <section className="card" style={{ gridColumn: "1 / -1", border: `1.5px solid ${border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, color: "var(--plum)" }}>⏱️ Erfassungs-Check</h2>
        <span
          style={{
            marginLeft: "auto",
            fontWeight: 800,
            fontSize: 13.5,
            color: accent,
            background: bg,
            border: `1.5px solid ${border}`,
            padding: "5px 13px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          {behind ? `⚠️ ${Math.abs(check.delta)} h unter Soll` : "✓ auf Kurs"}
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 16 }}>
        {check.isCurrentMonth ? "Soll bis" : "Soll ganzer Monat bis"} {fmtFull(check.asOf)} · erfasste vs. erwartete Stunden
      </p>

      <div style={{ display: "flex", gap: 30, flexWrap: "wrap", marginBottom: check.missingDays.length ? 18 : 0 }}>
        <div>
          <span style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, color: "var(--plum)" }}>
            {check.expectedToDate} h
          </span>
          <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>Soll bis heute</span>
        </div>
        <div>
          <span style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, color: behind ? "#c0145a" : "var(--hotpink)" }}>
            {check.recorded} h
          </span>
          <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>erfasst</span>
        </div>
        <div>
          <span style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, color: accent }}>
            {check.delta > 0 ? "+" : ""}{check.delta} h
          </span>
          <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>Differenz</span>
        </div>
      </div>

      {check.missingDays.length > 0 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--plum)", marginBottom: 8 }}>
            🗓️ {check.missingDays.length} Arbeitstag{check.missingDays.length === 1 ? "" : "e"} ohne Erfassung
            <span style={{ fontWeight: 600, color: "var(--plum-soft)" }}> — vergessen, Ferien oder frei?</span>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {check.missingDays.map((d) => (
              <span
                key={d}
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#c0145a",
                  background: "#fff0f5",
                  border: "1.5px solid #ffd0e6",
                  padding: "5px 11px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                {fmtDay(d)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
