"use client";

import { useState } from "react";
import type { NonBillableProject } from "@/lib/metrics/nonBillable";
import { useIcon } from "./ThemeContext";

interface Props {
  projects: NonBillableProject[];
  userName: string;
}

const PIP_COLORS = ["#ff4fa3", "#c9a7ff", "#a9b8ff", "#ffd86b", "#9af7d8"];

function fmtDay(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short" });
}

export default function NonBillableChart({ projects, userName }: Props) {
  const ic = useIcon();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="card">
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>
        {ic("nonBillable")} Top 5 — nicht verrechenbar
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 20 }}>
        Projekte mit den meisten internen Stunden — zum Aufklappen anklicken
      </p>

      {projects.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--plum-soft)", fontFamily: "var(--font-heading)", fontSize: "1.05rem", padding: "20px 0" }}>
          Alles verrechenbar — {userName} rockt! 🌟
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(() => {
            const maxHours = Math.max(...projects.map((p) => p.nonBillableHours), 1);
            return projects.map((p, i) => {
              const isOpen = open === p.projectId;
              return (
                <div key={p.projectId}>
                  <div
                    onClick={() => setOpen(isOpen ? null : p.projectId)}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    role="button"
                    aria-expanded={isOpen}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: PIP_COLORS[i % PIP_COLORS.length], flexShrink: 0, display: "inline-block" }} />
                        <span style={{ fontSize: 11, color: "var(--plum-soft)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block" }}>▶</span>
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

                  {isOpen && (
                    <div style={{ marginTop: 10, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                      {p.entries.length === 0 ? (
                        <span style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600 }}>Keine Einzelpositionen.</span>
                      ) : (
                        p.entries.map((e, j) => (
                          <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--input-bg)", borderRadius: 10, padding: "8px 11px" }}>
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--plum-soft)", whiteSpace: "nowrap", minWidth: 74 }}>{fmtDay(e.date)}</span>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--plum)" }}>
                              {e.description || <span style={{ color: "var(--plum-soft)", fontStyle: "italic" }}>ohne Beschreibung</span>}
                              {e.task && <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--plum-soft)", marginTop: 1 }}>{e.task}</span>}
                            </span>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--hotpink)", whiteSpace: "nowrap" }}>{e.hours} h</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}
    </section>
  );
}
