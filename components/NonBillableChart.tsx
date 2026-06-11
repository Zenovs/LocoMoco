"use client";

import type { NonBillableProject } from "@/lib/metrics/nonBillable";
import { useIcon } from "./ThemeContext";

interface Props {
  projects: NonBillableProject[];
  userName: string;
}

const PIP_COLORS = ["#ff4fa3", "#c9a7ff", "#a9b8ff", "#ffd86b", "#9af7d8"];

export default function NonBillableChart({ projects, userName }: Props) {
  const ic = useIcon();
  return (
    <section className="card">
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>
        {ic("nonBillable")} Top 5 — nicht verrechenbar
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 20 }}>
        Projekte mit den meisten internen (nicht verrechenbaren) Stunden
      </p>

      {projects.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--plum-soft)", fontFamily: "var(--font-heading)", fontSize: "1.05rem", padding: "20px 0" }}>
          Alles verrechenbar — {userName} rockt! 🌟
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(() => {
            const maxHours = Math.max(...projects.map((p) => p.nonBillableHours), 1);
            return projects.map((p, i) => (
              <div key={p.projectId}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: PIP_COLORS[i % PIP_COLORS.length], flexShrink: 0, display: "inline-block" }} />
                    {p.projectName}
                  </span>
                  <span style={{ whiteSpace: "nowrap", marginLeft: 8, textAlign: "right" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, color: "var(--hotpink)" }}>
                      {p.nonBillableHours} h
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--plum-soft)", marginLeft: 6 }}>
                      {p.nonBillablePct}% intern
                    </span>
                  </span>
                </div>
                <div className="bar">
                  <i style={{ width: `${Math.round((p.nonBillableHours / maxHours) * 100)}%` }} />
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </section>
  );
}
