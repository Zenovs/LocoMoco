"use client";

import { useCallback, useEffect, useState } from "react";
import type { MocoUser } from "@/types/moco";
import type { ProductivityResult } from "@/lib/metrics/productivity";
import type { NonBillableProject } from "@/lib/metrics/nonBillable";
import type { OverBudgetProject } from "@/lib/metrics/overBudget";
import type { SleepingProject } from "@/lib/metrics/sleeping";
import ProductivityRing from "./ProductivityRing";
import NonBillableChart from "./NonBillableChart";
import OverBudgetList from "./OverBudgetList";
import SleepingList from "./SleepingList";
import MonthCompare, { type MonthSlot } from "./MonthCompare";

interface DashboardData {
  users: MocoUser[];
  productivity: ProductivityResult;
  productivityDelta: number;
  nonBillable: NonBillableProject[];
  overBudget: OverBudgetProject[];
}

interface Props {
  onSettingsChange: () => void;
}

const MONTHS = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

const monthLabel = (y: number, m: number) => `${MONTHS[m - 1]} ${y}`;

export default function Dashboard({ onSettingsChange }: Props) {
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

  // Monatsvergleich
  const prevDefault = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const [compare, setCompare] = useState(false);
  const [cmpYear, setCmpYear] = useState(prevDefault.y);
  const [cmpMonth, setCmpMonth] = useState(prevDefault.m);
  const [cmpData, setCmpData] = useState<{ a: MonthSlot; b: MonthSlot } | null>(null);
  const [cmpLoading, setCmpLoading] = useState(false);

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

  const loadDashboard = useCallback(() => {
    if (!selectedUserId) return;
    setLoading(true);
    setError("");
    setSleeping(null);
    fetch(`/api/dashboard?userId=${selectedUserId}&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d: DashboardData & { error?: string }) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Daten konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [selectedUserId, year, month]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Schläferprojekte separat laden (global, unabhängig von User/Monat)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/sleeping")
      .then((r) => r.json())
      .then((d: { sleeping?: SleepingProject[] }) => {
        if (!cancelled) setSleeping(d.sleeping ?? []);
      })
      .catch(() => {
        if (!cancelled) setSleeping([]);
      });
    return () => { cancelled = true; };
  }, []);

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
  }, [compare, selectedUserId, year, month, cmpYear, cmpMonth]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

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
                fontFamily: "Pacifico, cursive",
                fontSize: "clamp(40px,7vw,64px)",
                lineHeight: .95,
                background: "linear-gradient(110deg,#ff8fd0 0%,#c9a7ff 30%,#a9d8ff 55%,#ffd86b 78%,#ff8fd0 100%)",
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

          <button onClick={onSettingsChange} className="chip" aria-label="Einstellungen" style={{ fontSize: "0.95rem" }}>
            ⚙️
          </button>
        </header>

        {/* Steuerleiste */}
        <div className="card" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14, marginBottom: 22, padding: "16px 18px" }}>
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

          <button
            onClick={() => setCompare((c) => !c)}
            className={`chip ${compare ? "active" : ""}`}
            style={{ height: 44 }}
          >
            {compare ? "✓ " : "⚖️ "}Vergleichen
          </button>

          {compare && (
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

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--hotpink)" }}>
            <p style={{ fontFamily: "Fredoka, sans-serif", fontSize: "1.2rem" }} className="animate-pulse">
              Zahlen werden geholt… 💫
            </p>
          </div>
        )}

        {/* Dashboard */}
        {!loading && data && selectedUser && (
          <>
            {compare && (
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
            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 22 }} className="responsive-grid">
              <ProductivityRing
                productivity={data.productivity}
                delta={data.productivityDelta}
                userName={selectedUser.firstname}
                month={MONTHS[month - 1]}
                year={year}
              />
              <NonBillableChart projects={data.nonBillable} userName={selectedUser.firstname} />
            </div>

            {/* Bottom row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }} className="responsive-grid">
              <OverBudgetList projects={data.overBudget} />
              {sleeping === null ? (
                <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--plum-soft)", fontWeight: 600, minHeight: 160 }}>
                  <span className="animate-pulse">😴 Schläferprojekte werden gesucht…</span>
                </div>
              ) : (
                <SleepingList projects={sleeping} />
              )}
            </div>
          </>
        )}

        {!loading && data && data.productivity.totalHours === 0 && (
          <p style={{ textAlign: "center", color: "var(--plum-soft)", fontFamily: "Fredoka, sans-serif", fontSize: "1.2rem", marginTop: 32 }}>
            Noch nichts gebucht diesen Monat 🌸
          </p>
        )}

        <footer style={{ textAlign: "center", marginTop: 40, color: "var(--plum-soft)", fontWeight: 600, fontSize: 13 }}>
          made with 💅 by <span style={{ color: "var(--hotpink)" }}>wireon</span> · Daten live aus MOCO
        </footer>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .responsive-grid { grid-template-columns: 1fr !important; }
        }
        .select {
          appearance: none;
          cursor: pointer;
          border-radius: 14px;
          border: 1.5px solid #ffc4e3;
          background: rgba(255,255,255,.75);
          color: var(--plum);
          font-family: Quicksand, sans-serif;
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
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--plum-soft)", fontFamily: "Fredoka, sans-serif" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
