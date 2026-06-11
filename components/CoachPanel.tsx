"use client";

import type { Advice } from "@/lib/advice";
import type { TimeWaster } from "@/lib/metrics/timeWasters";

interface Props {
  userName: string;
  targetPct: number;
  actualPct: number;
  advice: Advice;
  timeWasters: TimeWaster[];
}

export default function CoachPanel({ userName, targetPct, actualPct, advice, timeWasters }: Props) {
  const maxH = Math.max(...timeWasters.map((t) => t.hours), 1);

  return (
    <section
      className="card"
      style={{ gridColumn: "1 / -1", border: "1.5px solid #ffd0e6", background: "linear-gradient(180deg, rgba(255,240,247,.9), rgba(255,255,255,.7))" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>🧚‍♀️</span>
        <h2 style={{ fontSize: 18, color: "var(--plum)" }}>Loco-Coach</h2>
        <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 13, color: "#c0145a", background: "#fff0f5", border: "1.5px solid #ffd0e6", padding: "5px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>
          {actualPct}% · Ziel {targetPct}%
        </span>
      </div>
      <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 18 }}>
        {userName} liegt diesen Monat unter dem Mindestziel. Hier sind die größten Zeitfresser und ein paar Ideen 💡
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="responsive-grid">
        {/* Zeitfresser */}
        <div>
          <h3 style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--plum)", marginBottom: 12 }}>
            🍩 Größte Zeitfresser (intern)
          </h3>
          {timeWasters.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>
              Keine internen Buchungen gefunden — das Ziel liegt eher an fehlenden verrechenbaren Stunden.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {timeWasters.map((t, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--plum)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.label}
                    </span>
                    <span style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--hotpink)", whiteSpace: "nowrap" }}>
                      {t.hours} h
                    </span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${Math.round((t.hours / maxH) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lösungsvorschläge */}
        <div>
          <h3 style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--plum)", marginBottom: 12 }}>
            💡 Mögliche Lösungen
          </h3>
          <ul style={{ display: "flex", flexDirection: "column", gap: 11, listStyle: "none", padding: 0, margin: 0 }}>
            {advice.suggestions.map((sug, i) => (
              <li key={i} style={{ display: "flex", gap: 9, fontSize: 13.5, color: "var(--plum)", fontWeight: 600, lineHeight: 1.45 }}>
                <span style={{ flexShrink: 0 }}>{["✨", "🎯", "🧹", "📌", "🚀"][i % 5]}</span>
                <span>{sug}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
