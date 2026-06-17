"use client";

import { useState } from "react";
import type { SleepingProject } from "@/lib/metrics/sleeping";
import { useIcon } from "./ThemeContext";

interface Props {
  projects: SleepingProject[];
}

interface FlatEntry { person: string; date: string; task: string; description: string; hours: number; billable: boolean }
type Detail = { loading: boolean; recent: FlatEntry[] };

const AVATARS = ["🌙", "💤", "🦄", "🌸", "⭐", "🌷", "🫧", "🦋"];

function daysLabel(days: number): string {
  if (days >= 9999) return "über 3 Monate";
  return `${days} Tag${days === 1 ? "" : "e"}`;
}
function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function SleepingList({ projects }: Props) {
  const ic = useIcon();
  const [open, setOpen] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, Detail>>({});

  function toggle(projectId: number) {
    const isOpen = open === projectId;
    setOpen(isOpen ? null : projectId);
    if (!isOpen && !details[projectId]) {
      setDetails((d) => ({ ...d, [projectId]: { loading: true, recent: [] } }));
      fetch(`/api/project-activities?projectId=${projectId}`)
        .then((r) => r.json())
        .then((d: { people?: { name: string; entries: { date: string; task: string; description: string; hours: number; billable: boolean }[] }[] }) => {
          const flat: FlatEntry[] = (d.people ?? []).flatMap((p) => p.entries.map((e) => ({ person: p.name, ...e })));
          flat.sort((a, b) => b.date.localeCompare(a.date));
          setDetails((prev) => ({ ...prev, [projectId]: { loading: false, recent: flat } }));
        })
        .catch(() => setDetails((prev) => ({ ...prev, [projectId]: { loading: false, recent: [] } })));
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>
        {ic("sleeping")} Seit 60 Tagen schlafend
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 20 }}>
        keine Aktivität — Projekt anklicken: wer hat zuletzt gebucht?
      </p>

      {projects.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--plum-soft)", fontFamily: "var(--font-heading)", fontSize: "1.05rem", padding: "20px 0" }}>
          Alle aktiven Projekte sind lebendig 🌱
        </p>
      ) : (
        <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
          {projects.map((p, i) => {
            const isOpen = open === p.projectId;
            const det = details[p.projectId];
            return (
              <div key={p.projectId} style={{ borderBottom: i < projects.length - 1 ? "1.5px dashed #ffd0e6" : "none" }}>
                <div
                  onClick={() => toggle(p.projectId)}
                  role="button"
                  aria-expanded={isOpen}
                  style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 0", cursor: "pointer" }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", fontSize: 20, background: "linear-gradient(135deg,#ffe3f1,rgba(233,222,255,.95))", flexShrink: 0 }}>
                    {AVATARS[i % AVATARS.length]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontFamily: "var(--font-heading)", fontSize: 14, display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
                      <span style={{ fontSize: 10, color: "var(--plum-soft)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.projectName}</span>
                    </b>
                    {p.customerName && (
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--hotpink)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginLeft: 17 }}>
                        👤 {p.customerName}
                      </span>
                    )}
                    {p.lastActivityDate && (
                      <span style={{ display: "block", fontSize: 12, color: "var(--plum-soft)", fontWeight: 600, marginLeft: 17 }}>
                        letzte Buchung: {new Date(p.lastActivityDate).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: p.daysSinceActivity > 180 ? "#c0145a" : "#6b2d6b", background: p.daysSinceActivity > 180 ? "#fff0f7" : "#f5eeff", padding: "6px 11px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {ic("sleeping")} {daysLabel(p.daysSinceActivity)}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ padding: "4px 0 14px 17px" }}>
                    {!det || det.loading ? (
                      <span style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600 }} className="animate-pulse">Lädt Buchungen…</span>
                    ) : det.recent.length === 0 ? (
                      <span style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600 }}>Keine Buchung in den letzten 12 Monaten (oder keine Berechtigung).</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--plum)", background: "#f5eeff", border: "1.5px solid #e6d8ff", borderRadius: 10, padding: "7px 11px", alignSelf: "flex-start" }}>
                          🕑 Zuletzt: <span style={{ color: "var(--hotpink)" }}>{det.recent[0].person}</span> am {fmtDay(det.recent[0].date)}
                        </span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {det.recent.slice(0, 15).map((e, ei) => (
                            <div key={ei} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5 }}>
                              <span style={{ width: 7, height: 7, borderRadius: 7, marginTop: 5, flexShrink: 0, background: e.billable ? "#0a8a4a" : "#c97a00" }} title={e.billable ? "verrechenbar" : "intern"} />
                              <span style={{ fontWeight: 700, color: "var(--plum-soft)", whiteSpace: "nowrap", minWidth: 92 }}>{fmtDay(e.date)}</span>
                              <span style={{ fontWeight: 700, color: "var(--plum)", whiteSpace: "nowrap" }}>{e.person}</span>
                              <span style={{ flex: 1, fontWeight: 600, color: "var(--plum-soft)" }}>
                                {e.task && <span>{e.task}: </span>}
                                {e.description || <span style={{ fontStyle: "italic" }}>—</span>}
                              </span>
                              <span style={{ fontWeight: 800, color: "var(--hotpink)", whiteSpace: "nowrap" }}>{e.hours} h</span>
                            </div>
                          ))}
                        </div>
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
