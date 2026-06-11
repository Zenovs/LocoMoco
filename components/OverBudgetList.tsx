"use client";

import type { OverBudgetProject } from "@/lib/metrics/overBudget";
import { useIcon } from "./ThemeContext";

interface Props {
  projects: OverBudgetProject[];
}

export default function OverBudgetList({ projects }: Props) {
  const ic = useIcon();
  return (
    <section className="card">
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>
        {ic("overBudget")} Über Budget
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 20 }}>
        mehr Stunden gebraucht als geplant
      </p>

      {projects.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--plum-soft)", fontFamily: "var(--font-heading)", fontSize: "1.05rem", padding: "20px 0" }}>
          Alle Projekte im grünen Bereich 💚
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {projects.map((p) => (
            <div
              key={p.projectId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "13px 14px",
                borderRadius: 16,
                background: "rgba(255,236,245,.7)",
                border: "1.5px solid #ffd0e6",
              }}
            >
              <div>
                <b style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{p.projectName}</b>
                <span style={{ display: "block", fontSize: 12, color: "var(--plum-soft)", fontWeight: 600, marginTop: 2 }}>
                  geplant {p.hoursPlanned}h · gebucht {p.hoursTotal}h · {p.progressPct}%
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#e63970",
                  background: "#fff",
                  padding: "7px 12px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px -4px rgba(230,57,112,.5)",
                }}
              >
                +{p.hoursOver}h
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
