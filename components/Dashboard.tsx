"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MocoUser } from "@/types/moco";
import type { ProductivityResult } from "@/lib/metrics/productivity";
import type { NonBillableProject } from "@/lib/metrics/nonBillable";
import type { OverBudgetProject } from "@/lib/metrics/overBudget";
import type { SleepingProject } from "@/lib/metrics/sleeping";
import type { TimeWaster } from "@/lib/metrics/timeWasters";
import type { HoursCheckResult } from "@/lib/metrics/hoursCheck";
import { buildAdvice } from "@/lib/advice";
import ProductivityRing from "./ProductivityRing";
import NonBillableChart from "./NonBillableChart";
import OverBudgetList from "./OverBudgetList";
import SleepingList from "./SleepingList";
import MonthCompare, { type MonthSlot } from "./MonthCompare";
import LoadingScreen from "./LoadingScreen";
import CoachPanel from "./CoachPanel";
import HoursCheck from "./HoursCheck";
import CompanySection from "./CompanySection";
import LocoChat from "./LocoChat";
import CalendarCard from "./CalendarCard";
import type { CalendarDay } from "@/lib/metrics/calendar";

interface DashboardData {
  users: MocoUser[];
  productivity: ProductivityResult;
  productivityDelta: number;
  nonBillable: NonBillableProject[];
  timeWasters: TimeWaster[];
  hoursCheck: HoursCheckResult;
  calendar: CalendarDay[];
}

const MONTHS = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

const monthLabel = (y: number, m: number) => `${MONTHS[m - 1]} ${y}`;

interface NativeBridge {
  postMessage: (msg: unknown) => void;
}
interface LocoWindow extends Window {
  webkit?: { messageHandlers?: { locomoco?: NativeBridge } };
  __locoExport?: (action: "pdf" | "share") => void;
}

export default function Dashboard() {
  const now = new Date();
  const [users, setUsers] = useState<MocoUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Schläferprojekte: lazy nachgeladen
  const [sleeping, setSleeping] = useState<SleepingProject[] | null>(null);
  // Über Budget: separat/lazy (braucht teure Projekt-Reports)
  const [overBudget, setOverBudget] = useState<OverBudgetProject[] | null>(null);

  // Auth-Status (wer ist angemeldet, welche Freigaben/Karten)
  const [auth, setAuth] = useState<{
    enabled: boolean;
    user: { name: string; role: string } | null;
    caps: string[];
    cards: string[];
  }>({ enabled: false, user: null, caps: [], cards: [] });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { authEnabled: boolean; user: { name: string; role: string } | null; capabilities?: string[]; cards?: string[] }) =>
        setAuth({ enabled: d.authEnabled, user: d.user, caps: d.capabilities ?? [], cards: d.cards ?? [] })
      )
      .catch(() => {});
  }, []);

  // Eine Karte zeigen? Ohne Auth = alles; mit Auth = nur freigegebene Karten.
  const showCard = (key: string) => !auth.enabled || auth.cards.includes(key);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  // Mindestziele pro Mitarbeiter (userId -> %)
  const [targets, setTargets] = useState<Record<string, number>>({});

  // Monatsvergleich
  const prevDefault = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const [compare, setCompare] = useState(false);
  const [cmpYear, setCmpYear] = useState(prevDefault.y);
  const [cmpMonth, setCmpMonth] = useState(prevDefault.m);
  const [cmpData, setCmpData] = useState<{ a: MonthSlot; b: MonthSlot } | null>(null);
  const [cmpLoading, setCmpLoading] = useState(false);

  // Mindestziele laden
  useEffect(() => {
    fetch("/api/targets")
      .then((r) => r.json())
      .then((d: { targets?: Record<string, number> }) => setTargets(d.targets ?? {}))
      .catch(() => {});
  }, []);

  const setTargetFor = useCallback((userId: number, value: number | null) => {
    fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, target: value }),
    })
      .then((r) => r.json())
      .then((d: { targets?: Record<string, number> }) => { if (d.targets) setTargets(d.targets); })
      .catch(() => {});
  }, []);

  // Mitarbeiter + Standardauswahl (eigene Person via Setup-Benutzername)
  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()) as Promise<MocoUser[]>,
      fetch("/api/config")
        .then((r) => r.json())
        .then((c: { username?: string }) => c.username ?? "")
        .catch(() => ""),
    ])
      .then(([list, username]) => {
        const active = list.filter((u) => u.active);
        setUsers(active);
        if (active.length === 0) return;
        const wanted = username.trim().toLowerCase();
        const me = wanted
          ? active.find((u) => {
              const full = `${u.firstname} ${u.lastname}`.toLowerCase();
              return full === wanted || u.email?.toLowerCase() === wanted || full.includes(wanted);
            })
          : undefined;
        setSelectedUserId((me ?? active[0]).id);
      })
      .catch(() => setError("Mitarbeiter konnten nicht geladen werden."));
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const reqRef = useRef(0);

  const loadDashboard = useCallback(() => {
    if (!selectedUserId) return;
    const myReq = ++reqRef.current; // nur die jeweils letzte Antwort gewinnt
    setLoading(true);
    setError("");
    fetch(`/api/dashboard?userId=${selectedUserId}&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d: DashboardData & { error?: string }) => {
        if (myReq !== reqRef.current) return; // veraltete Antwort verwerfen
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => { if (myReq === reqRef.current) setError("Daten konnten nicht geladen werden."); })
      .finally(() => { if (myReq === reqRef.current) setLoading(false); });
  }, [selectedUserId, year, month]);

  useEffect(() => { loadDashboard(); }, [loadDashboard, refreshTick]);

  // "Über Budget" separat laden (teure Projekt-Reports) — nur wenn freigeschaltet.
  useEffect(() => {
    if (!selectedUserId) return;
    if (auth.enabled && !auth.cards.includes("overBudget")) { setOverBudget([]); return; }
    let cancelled = false;
    setOverBudget(null);
    fetch(`/api/overbudget?userId=${selectedUserId}&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d: { overBudget?: OverBudgetProject[] }) => { if (!cancelled) setOverBudget(d.overBudget ?? []); })
      .catch(() => { if (!cancelled) setOverBudget([]); });
    return () => { cancelled = true; };
  }, [selectedUserId, year, month, refreshTick, auth.enabled, auth.cards]);

  // Schläferprojekte separat laden (global). Nur, wenn die Karte freigegeben ist
  // (sonst liefert /api/sleeping ohnehin 403).
  useEffect(() => {
    if (auth.enabled && !auth.cards.includes("sleeping")) {
      setSleeping([]);
      return;
    }
    let cancelled = false;
    setSleeping(null);
    fetch("/api/sleeping")
      .then((r) => r.json())
      .then((d: { sleeping?: SleepingProject[] }) => {
        if (!cancelled) setSleeping(d.sleeping ?? []);
      })
      .catch(() => {
        if (!cancelled) setSleeping([]);
      });
    return () => { cancelled = true; };
  }, [refreshTick, auth.enabled, auth.cards]);

  // Daten frisch von MOCO holen (Cache leeren)
  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    fetch("/api/refresh", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        setRefreshTick((t) => t + 1);
        setCmpData(null);
        window.setTimeout(() => setRefreshing(false), 600);
      });
  }, [refreshing]);

  // Vergleichsdaten laden
  useEffect(() => {
    if (!compare || !selectedUserId) { setCmpData(null); return; }
    setCmpLoading(true);
    let cancelled = false;
    const fetchMonth = (y: number, m: number) =>
      fetch(`/api/month?userId=${selectedUserId}&year=${y}&month=${m}`)
        .then((r) => r.json()) as Promise<{ productivity: ProductivityResult; error?: string }>;
    Promise.all([fetchMonth(year, month), fetchMonth(cmpYear, cmpMonth)])
      .then(([a, b]) => {
        if (cancelled || a.error || b.error) return;
        setCmpData({
          a: { label: monthLabel(year, month), productivity: a.productivity },
          b: { label: monthLabel(cmpYear, cmpMonth), productivity: b.productivity },
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCmpLoading(false); });
    return () => { cancelled = true; };
  }, [compare, selectedUserId, year, month, cmpYear, cmpMonth, refreshTick]);

  // Export-Brücke: PDF sichern / teilen (nativ via WKWebView, sonst Browser-Fallback)
  useEffect(() => {
    const w = window as unknown as LocoWindow;
    w.__locoExport = (action: "pdf" | "share") => {
      const u = users.find((x) => x.id === selectedUserId);
      const name = u ? `${u.firstname} ${u.lastname}` : "Bericht";
      const period = `${MONTHS[month - 1]} ${year}`;
      const filename = `Loco Moco – ${name} – ${period}.pdf`;
      const subject = `Loco Moco Bericht – ${name} – ${period}`;
      document.body.classList.add("exporting");
      window.setTimeout(() => {
        const bridge = w.webkit?.messageHandlers?.locomoco;
        if (bridge) bridge.postMessage({ action, filename, subject });
        else if (action === "pdf") window.print();
        else window.location.href = `mailto:?subject=${encodeURIComponent(subject)}`;
      }, 130);
      window.setTimeout(() => document.body.classList.remove("exporting"), 1600);
    };
    return () => { delete (window as unknown as LocoWindow).__locoExport; };
  }, [users, selectedUserId, month, year]);

  const triggerExport = (action: "pdf" | "share") =>
    (window as unknown as LocoWindow).__locoExport?.(action);

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const selectedTarget = selectedUserId != null ? targets[String(selectedUserId)] ?? null : null;
  const advice =
    data && selectedTarget !== null
      ? buildAdvice(data.productivity, selectedTarget, data.timeWasters)
      : null;

  const yearOptions: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) yearOptions.push(y);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 18 }}>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(40px,7vw,64px)",
                lineHeight: .95,
                background: "var(--holo)",
                backgroundSize: "220% 220%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                animation: "shimmer 6s ease-in-out infinite",
                filter: "drop-shadow(0 3px 10px rgba(255,79,163,.35))",
              }}
            >
              Loco&nbsp;Moco
            </h1>
            <p style={{ fontWeight: 600, color: "var(--plum-soft)", marginTop: 4 }}>
              deine Zeiterfassung, aber <span style={{ color: "var(--hotpink)" }}>fabelhaft</span> ✨
            </p>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={handleRefresh} className="chip" disabled={refreshing} aria-label="Aktualisieren" style={{ fontWeight: 700 }}>
              <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>🔄</span>
              {refreshing ? " Lädt…" : " Aktualisieren"}
            </button>
            <button onClick={() => triggerExport("pdf")} className="chip" style={{ fontWeight: 700 }}>
              📄 PDF
            </button>
            <button onClick={() => triggerExport("share")} className="chip" style={{ fontWeight: 700 }}>
              ✉️ Teilen
            </button>
            {auth.enabled && ["users.manage", "roles.manage", "config.manage", "salary.manage", "liquidity.manage"].some((c) => auth.caps.includes(c)) && (
              <a href="/admin" className="chip" style={{ textDecoration: "none", fontWeight: 700 }}>👥 Verwaltung</a>
            )}
            {auth.enabled && auth.user && (
              <>
                <span className="chip" style={{ cursor: "default" }} title={`Rolle: ${auth.user.role}`}>👤 {auth.user.name}</span>
                <button onClick={logout} className="chip" style={{ fontWeight: 700 }}>Abmelden</button>
              </>
            )}
          </div>
        </header>

        {/* Steuerleiste */}
        <div className="card no-print" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14, marginBottom: 22, padding: "16px 18px" }}>
          <Field label="Mitarbeiter">
            <select
              value={selectedUserId ?? ""}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className="select"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>
              ))}
            </select>
          </Field>

          <Field label="Monat">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="select">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </Field>

          <Field label="Jahr">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="select">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>

          {showCard("compare") && (
            <button
              onClick={() => setCompare((c) => !c)}
              className={`chip ${compare ? "active" : ""}`}
              style={{ height: 44 }}
            >
              {compare ? "✓ " : "⚖️ "}Vergleichen
            </button>
          )}

          {compare && showCard("compare") && (
            <>
              <span style={{ alignSelf: "center", fontWeight: 700, color: "var(--plum-soft)" }}>vs.</span>
              <Field label="Vergleichsmonat">
                <select value={cmpMonth} onChange={(e) => setCmpMonth(Number(e.target.value))} className="select">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </Field>
              <Field label="Jahr">
                <select value={cmpYear} onChange={(e) => setCmpYear(Number(e.target.value))} className="select">
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="card mb-6" style={{ color: "#c0145a", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Loco-Chat (lokale KI) */}
        {showCard("chat") && (
          <div style={{ marginBottom: 22 }}>
            <LocoChat defaultYear={year} defaultMonth={month} />
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingScreen />}

        {/* Dashboard */}
        {!loading && data && selectedUser && (
          <>
            {compare && showCard("compare") && (
              cmpData ? (
                <div style={{ marginBottom: 22 }}>
                  <MonthCompare a={cmpData.a} b={cmpData.b} />
                </div>
              ) : (
                <div className="card" style={{ marginBottom: 22, textAlign: "center", color: "var(--hotpink)", fontWeight: 600 }}>
                  {cmpLoading ? "Vergleich wird geladen… 💫" : "Vergleich nicht verfügbar."}
                </div>
              )
            )}

            {/* Top row */}
            {(showCard("productivity") || showCard("nonBillable")) && (
              <div style={{ display: "grid", gridTemplateColumns: showCard("productivity") && showCard("nonBillable") ? "1.15fr 1fr" : "1fr", gap: 22 }} className="responsive-grid">
                {showCard("productivity") && (
                  <ProductivityRing
                    productivity={data.productivity}
                    delta={data.productivityDelta}
                    userName={selectedUser.firstname}
                    month={MONTHS[month - 1]}
                    year={year}
                    target={selectedTarget}
                    onSetTarget={(v) => selectedUserId != null && setTargetFor(selectedUserId, v)}
                  />
                )}
                {showCard("nonBillable") && (
                  <NonBillableChart projects={data.nonBillable} userName={selectedUser.firstname} />
                )}
              </div>
            )}

            {/* Erfassungs-Check: Soll bis heute vs. erfasst + vergessene Tage */}
            {showCard("hoursCheck") && data.hoursCheck && (
              <div style={{ marginTop: 22 }}>
                <HoursCheck check={data.hoursCheck} userName={selectedUser.firstname} />
              </div>
            )}

            {/* Coach-Panel, wenn unter Mindestziel */}
            {showCard("coach") && advice?.belowTarget && selectedTarget !== null && (
              <div style={{ marginTop: 22 }}>
                <CoachPanel
                  userName={selectedUser.firstname}
                  targetPct={selectedTarget}
                  actualPct={data.productivity.productivityPct}
                  advice={advice}
                  timeWasters={data.timeWasters}
                />
              </div>
            )}

            {/* Kalender (Tagesübersicht) — kommt direkt aus dem Dashboard-Abruf */}
            {showCard("kalender") && data.calendar && (
              <div style={{ marginTop: 22 }}>
                <CalendarCard days={data.calendar} year={year} month={month} userName={selectedUser.firstname} />
              </div>
            )}

            {/* Bottom row */}
            {(showCard("overBudget") || showCard("sleeping")) && (
              <div style={{ display: "grid", gridTemplateColumns: showCard("overBudget") && showCard("sleeping") ? "1fr 1fr" : "1fr", gap: 22, marginTop: 22 }} className="responsive-grid">
                {showCard("overBudget") &&
                  (overBudget === null ? (
                    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--plum-soft)", fontWeight: 600, minHeight: 160 }}>
                      <span className="animate-pulse">💸 Budgets werden geprüft…</span>
                    </div>
                  ) : (
                    <OverBudgetList projects={overBudget} />
                  ))}
                {showCard("sleeping") &&
                  (sleeping === null ? (
                    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--plum-soft)", fontWeight: 600, minHeight: 160 }}>
                      <span className="animate-pulse">😴 Schläferprojekte werden gesucht…</span>
                    </div>
                  ) : (
                    <SleepingList projects={sleeping} />
                  ))}
              </div>
            )}
          </>
        )}

        {!loading && data && data.productivity.totalHours === 0 && (
          <p style={{ textAlign: "center", color: "var(--plum-soft)", fontFamily: "var(--font-heading)", fontSize: "1.2rem", marginTop: 32 }}>
            Noch nichts gebucht diesen Monat 🌸
          </p>
        )}

        {/* Firmenweite Auswertungen (nur mit "Alle sehen" / data.all freigeschaltet) */}
        <CompanySection year={year} month={month} refreshTick={refreshTick} showCard={showCard} />

        <footer style={{ textAlign: "center", marginTop: 40, color: "var(--plum-soft)", fontWeight: 600, fontSize: 13 }}>
          made with 💅 by <span style={{ color: "var(--hotpink)" }}>wireon</span> · Daten live aus MOCO
        </footer>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .responsive-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        body.exporting .no-print { display: none !important; }
        body.exporting { background: #fff4fa !important; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
        .select {
          appearance: none;
          cursor: pointer;
          border-radius: 14px;
          border: 1.5px solid #ffc4e3;
          background: var(--input-bg);
          color: var(--plum);
          font-family: var(--font-body);
          font-weight: 700;
          padding: 11px 16px;
          outline: none;
          min-width: 130px;
        }
        .select:focus { border-color: var(--hotpink); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--plum-soft)", fontFamily: "var(--font-heading)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
