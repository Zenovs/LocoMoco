"use client";

import { useState } from "react";
import type { OverBudgetProject } from "@/lib/metrics/overBudget";
import { useIcon } from "./ThemeContext";

interface Entry { date: string; task: string; description: string; hours: number; billable: boolean }
interface Person { name: string; totalHours: number; billableHours: number; entries: Entry[] }
type Detail = { loading: boolean; people: Person[]; overBudgetSince?: string | null; overBeforeWindow?: boolean; from?: string };

interface Props {
  projects: OverBudgetProject[];
}

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short" });
}

export default function OverBudgetList({ projects }: Props) {
  const ic = useIcon();
  const [open, setOpen] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, Detail>>({});

  function toggle(p: OverBudgetProject) {
    const isOpen = open === p.projectId;
    setOpen(isOpen ? null : p.projectId);
    if (!isOpen && !details[p.projectId]) {
      setDetails((d) => ({ ...d, [p.projectId]: { loading: true, people: [] } }));
      fetch(`/api/project-activities?projectId=${p.projectId}&planned=${p.hoursPlanned}&total=${p.hoursTotal}`)
        .then((r) => r.json())
        .then((d: { people?: Person[]; overBudgetSince?: string | null; overBeforeWindow?: boolean; from?: string }) =>
          setDetails((prev) => ({ ...prev, [p.projectId]: { loading: false, people: d.people ?? [], overBudgetSince: d.overBudgetSince, overBeforeWindow: d.overBeforeWindow, from: d.from } })))
        .catch(() => setDetails((prev) => ({ ...prev, [p.projectId]: { loading: false, people: [] } })));
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>
        {ic("overBudget")} Über Budget
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 20 }}>
        mehr Stunden gebraucht als geplant — Projekt anklicken für Details
      </p>

      {projects.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--plum-soft)", fontFamily: "var(--font-heading)", fontSize: "1.05rem", padding: "20px 0" }}>
          Alle Projekte im grünen Bereich 💚
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {projects.map((p) => {
            const isOpen = open === p.projectId;
            const det = details[p.projectId];
            return (
              <div key={p.projectId} style={{ borderRadius: 16, background: "rgba(255,236,245,.7)", border: "1.5px solid #ffd0e6", overflow: "hidden" }}>
                <div
                  onClick={() => toggle(p)}
                  role="button"
                  aria-expanded={isOpen}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 14px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: 11, color: "#c0145a", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                    <div>
                      <b style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>{p.projectName}</b>
                      <span style={{ display: "block", fontSize: 12, color: "var(--plum-soft)", fontWeight: 600, marginTop: 2 }}>
                        geplant {p.hoursPlanned}h · gebucht {p.hoursTotal}h · {p.progressPct}%
                      </span>
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, color: "#e63970", background: "#fff", padding: "7px 12px", borderRadius: 999, whiteSpace: "nowrap", boxShadow: "0 4px 12px -4px rgba(230,57,112,.5)" }}>
                    +{p.hoursOver}h
                  </div>
                </div>

                {isOpen && (
                  <div style={{ background: "#fff", borderTop: "1.5px solid #ffd0e6", padding: "12px 14px" }}>
                    {!det || det.loading ? (
                      <span style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600 }} className="animate-pulse">Lädt Buchungen…</span>
                    ) : det.people.length === 0 ? (
                      <span style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600 }}>Keine Buchungen gefunden (oder keine Berechtigung).</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: "var(--plum-soft)", fontWeight: 700 }}>Alle Buchungen (grün = innerhalb Vorgabe, rot = darüber)</span>
                          {(det.overBudgetSince || det.overBeforeWindow) && (
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#c0145a", background: "#fff0f5", border: "1.5px solid #ffd0e6", borderRadius: 999, padding: "2px 9px" }}>
                              🔴 Über Budget {det.overBeforeWindow ? `(schon vor ${det.from ? fmtDay(det.from) : "12 Mt."})` : `seit ${det.overBudgetSince ? fmtDay(det.overBudgetSince) : ""}`}
                            </span>
                          )}
                        </div>
                        {det.people.map((person, pi) => (
                          <div key={pi}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                              <b style={{ fontSize: 13.5, color: "var(--plum)" }}>{person.name}</b>
                              <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--hotpink)" }}>{person.totalHours} h <span style={{ fontSize: 11, fontWeight: 600, color: "var(--plum-soft)" }}>({person.billableHours} h verr.)</span></span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {person.entries.map((e, ei) => {
                                const over = !!det.overBeforeWindow || (!!det.overBudgetSince && e.date >= det.overBudgetSince);
                                return (
                                  <div key={ei} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, background: over ? "#fff0f5" : "transparent", borderRadius: 8, padding: over ? "3px 6px" : "0 6px" }}>
                                    <span style={{ width: 7, height: 7, borderRadius: 7, marginTop: 5, flexShrink: 0, background: e.billable ? "#0a8a4a" : "#c97a00" }} title={e.billable ? "verrechenbar" : "intern"} />
                                    <span style={{ fontWeight: 700, color: over ? "#c0145a" : "var(--plum-soft)", whiteSpace: "nowrap", minWidth: 70 }}>{fmtDay(e.date)}</span>
                                    <span style={{ flex: 1, fontWeight: 600, color: over ? "#c0145a" : "var(--plum)" }}>
                                      {e.task && <span style={{ opacity: 0.8 }}>{e.task}: </span>}
                                      {e.description || <span style={{ fontStyle: "italic", opacity: 0.7 }}>ohne Beschreibung</span>}
                                    </span>
                                    <span style={{ fontWeight: 800, color: over ? "#c0145a" : "var(--hotpink)", whiteSpace: "nowrap" }}>{e.hours} h</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
