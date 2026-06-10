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

interface DashboardData {
  users: MocoUser[];
  productivity: ProductivityResult;
  productivityDelta: number;
  nonBillable: NonBillableProject[];
  overBudget: OverBudgetProject[];
  sleeping: SleepingProject[];
}

interface Props {
  onSettingsChange: () => void;
}

const MONTHS = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

export default function Dashboard({ onSettingsChange }: Props) {
  const now = new Date();
  const [users, setUsers] = useState<MocoUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((list: MocoUser[]) => {
        const active = list.filter((u) => u.active);
        setUsers(active);
        if (active.length > 0) setSelectedUserId(active[0].id);
      })
      .catch(() => setError("Mitarbeiter konnten nicht geladen werden."));
  }, []);

  const loadDashboard = useCallback(() => {
    if (!selectedUserId) return;
    setLoading(true);
    setError("");
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

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const yearOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) yearOptions.push(y);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 34 }}>
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

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* User chips */}
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={`chip ${selectedUserId === u.id ? "active" : ""}`}
              >
                {selectedUserId === u.id && <span className="dot" />}
                {u.firstname} {u.lastname}
              </button>
            ))}

            {/* Month selector */}
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="chip"
              style={{ appearance: "none", cursor: "pointer" }}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>

            {/* Year selector */}
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="chip"
              style={{ appearance: "none", cursor: "pointer" }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button onClick={onSettingsChange} className="chip" aria-label="Settings" style={{ fontSize: "0.85rem" }}>
              ⚙️
            </button>
          </div>
        </header>

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

        {/* Dashboard grid */}
        {!loading && data && selectedUser && (
          <>
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
              <SleepingList projects={data.sleeping} />
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
      `}</style>
    </div>
  );
}
