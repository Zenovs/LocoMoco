"use client";

import type { SleepingProject } from "@/lib/metrics/sleeping";

interface Props {
  projects: SleepingProject[];
}

const AVATARS = ["🌙", "💤", "🦄", "🌸", "⭐", "🌷", "🫧", "🦋"];

function daysLabel(days: number): string {
  if (days >= 9999) return "über 3 Monate";
  return `${days} Tag${days === 1 ? "" : "e"}`;
}

export default function SleepingList({ projects }: Props) {
  return (
    <section className="card">
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>
        😴 Seit 60 Tagen schlafend
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 20 }}>
        keine Aktivität — Zeit zum Aufwecken oder Archivieren
      </p>

      {projects.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--plum-soft)", fontFamily: "Fredoka, sans-serif", fontSize: "1.05rem", padding: "20px 0" }}>
          Alle aktiven Projekte sind lebendig 🌱
        </p>
      ) : (
        <div style={{ maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
          {projects.map((p, i) => (
            <div
              key={p.projectId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "12px 0",
                borderBottom: i < projects.length - 1 ? "1.5px dashed #ffd0e6" : "none",
              }}
            >
              {/* Emoji avatar */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  background: "linear-gradient(135deg,#ffe3f1,rgba(233,222,255,.95))",
                  flexShrink: 0,
                }}
              >
                {AVATARS[i % AVATARS.length]}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontFamily: "Fredoka, sans-serif", fontSize: 14, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.projectName}
                </b>
                {p.customerName && (
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--hotpink)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    👤 {p.customerName}
                  </span>
                )}
                {p.lastActivityDate && (
                  <span style={{ display: "block", fontSize: 12, color: "var(--plum-soft)", fontWeight: 600 }}>
                    letzte Buchung: {new Date(p.lastActivityDate).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
              </div>

              <div
                style={{
                  fontFamily: "Fredoka, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  color: p.daysSinceActivity > 180 ? "#c0145a" : "#6b2d6b",
                  background: p.daysSinceActivity > 180 ? "#fff0f7" : "#f5eeff",
                  padding: "6px 11px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                😴 {daysLabel(p.daysSinceActivity)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
