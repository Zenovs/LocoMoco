"use client";

import type { HoursCheckResult } from "@/lib/metrics/hoursCheck";
import type { SaldoResult } from "@/lib/metrics/saldo";
import { useIcon } from "./ThemeContext";

interface Props {
  check: HoursCheckResult;
  userName: string;
  cumulative?: SaldoResult | null; // kumuliertes Saldo seit Jahresbeginn
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

export default function HoursCheck({ check, userName, cumulative }: Props) {
  const ic = useIcon();
  if (!check.hasTarget) {
    return (
      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>{ic("hoursCheck")} Erfassungs-Check</h2>
        <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>
          Für {userName} ist kein Stellengrad in MOCO hinterlegt — ein Soll-Abgleich ist daher nicht möglich.
        </p>
      </section>
    );
  }

  if (check.asOf === null) {
    return (
      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>{ic("hoursCheck")} Erfassungs-Check</h2>
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
        <h2 style={{ fontSize: 18, color: "var(--plum)" }}>{ic("hoursCheck")} Erfassungs-Check</h2>
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
          {Math.abs(check.delta) <= TOLERANCE
            ? "✓ Saldo ausgeglichen"
            : behind
              ? `⚠️ Saldo −${Math.abs(check.delta)} h`
              : `↑ Saldo +${check.delta} h`}
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 16 }}>
        {check.isCurrentMonth ? "Soll bis" : "Soll ganzer Monat bis"} {fmtFull(check.asOf)} · erfasste vs. erwartete Stunden
      </p>

      {cumulative && (() => {
        const s = cumulative.saldo;
        const plus = s > TOLERANCE, minus = s < -TOLERANCE;
        const c = minus ? "#c0145a" : plus ? "#0a7c3e" : "var(--plum-soft)";
        const b = minus ? "#fff0f5" : plus ? "#effaf3" : "var(--input-bg)";
        const bo = minus ? "#ffd0e6" : plus ? "#bfead2" : "var(--chip-border)";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: b, border: `1.5px solid ${bo}`, borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--plum)" }}>📊 Kumuliertes Saldo</span>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 22, color: c }}>
              {s > 0 ? "+" : s < 0 ? "−" : ""}{Math.abs(s)} h
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: c }}>{minus ? "Minusstunden" : plus ? "Überstunden" : "ausgeglichen"}</span>
            <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: "var(--plum-soft)" }}>
              seit {fmtFull(cumulative.from)} · {cumulative.recorded} h erfasst / Soll {cumulative.soll} h
            </span>
          </div>
        );
      })()}

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
            {check.delta > 0 ? "+" : check.delta < 0 ? "−" : ""}{Math.abs(check.delta)} h
          </span>
          <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>
            Saldo bis heute{check.delta > TOLERANCE ? " (Überstunden)" : check.delta < -TOLERANCE ? " (Minusstunden)" : ""}
          </span>
        </div>
      </div>

      {check.absenceHours > 0 && (
        <p style={{ fontSize: 13, fontWeight: 700, color: "#0a7c3e", background: "#effaf3", border: "1.5px solid #bfead2", borderRadius: 12, padding: "8px 12px", marginBottom: check.missingDays.length ? 14 : 0 }}>
          🏖️ {check.absenceDays} Tag{check.absenceDays === 1 ? "" : "e"} Ferien/Krankheit berücksichtigt
          <span style={{ fontWeight: 600, color: "var(--plum-soft)" }}> — {check.absenceHours} h Soll dafür abgezogen, diese Tage zählen nicht als „vergessen".</span>
        </p>
      )}

      {check.missingDays.length > 0 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--plum)", marginBottom: 8 }}>
            🗓️ {check.missingDays.length} Arbeitstag{check.missingDays.length === 1 ? "" : "e"} ohne Erfassung
            <span style={{ fontWeight: 600, color: "var(--plum-soft)" }}> — keine Ferien/Krankheit hinterlegt, also vermutlich vergessen.</span>
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
