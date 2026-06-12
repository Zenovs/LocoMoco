"use client";

import { useEffect, useState, useCallback } from "react";

interface Role { key: string; name: string; builtin?: boolean; capabilities: string[]; cards: string[]; }
interface Cap { key: string; label: string; }
interface PublicUser { id: string; username: string; name: string; role: string; theme?: string; mocoUserId?: number; active: boolean; allowedCards?: string[]; }
interface MocoPerson { id: number; name: string; }

const THEMES = [
  { key: "girly", label: "Girly ✨" },
  { key: "pro", label: "Pro" },
  { key: "ocean", label: "Ocean" },
  { key: "lego", label: "Lego 🧱" },
  { key: "starwars", label: "Star Wars 🌌" },
  { key: "unihockey", label: "Unihockey 🏑" },
  { key: "darknerd", label: "Dark Nerd 🖥️" },
  { key: "ferien", label: "Ferien 🏖️" },
];

const input: React.CSSProperties = {
  borderRadius: 12, border: "1.5px solid var(--chip-border)", background: "var(--input-bg)",
  color: "var(--plum)", fontFamily: "var(--font-body)", padding: "8px 12px", fontWeight: 600, outline: "none",
};
const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--plum-soft)" };

type Tab = "users" | "roles" | "conn" | "rates" | "salaries" | "liquidity" | "audit";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [denied, setDenied] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [caps, setCaps] = useState<Cap[]>([]);
  const [cards, setCards] = useState<Cap[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [moco, setMoco] = useState<MocoPerson[]>([]);
  const [msg, setMsg] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Eigene Freigaben -> welche Tabs sichtbar sind.
  const [myCaps, setMyCaps] = useState<string[]>([]);
  const can = (c: string) => myCaps.includes(c);
  const canUsers = can("users.manage");
  const canRoles = can("roles.manage");
  const canConfig = can("config.manage");
  const canSalary = can("salary.manage");
  const canLiquidity = can("liquidity.manage");

  // ----- MOCO-Verbindung -----
  const [conn, setConn] = useState({ url: "", username: "", apiKey: "" });
  const [connConfigured, setConnConfigured] = useState(false);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { configured: boolean; subdomain?: string; username?: string }) => {
        setConnConfigured(d.configured);
        if (d.subdomain) setConn((c) => ({ ...c, url: `https://${d.subdomain}.mocoapp.com` }));
        if (d.username) setConn((c) => ({ ...c, username: d.username! }));
      })
      .catch(() => {});
  }, []);
  async function saveConn() {
    const res = await fetch("/api/config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conn),
    });
    const d = await res.json();
    if (!res.ok) return flash(d.error ?? "Fehler");
    setConnConfigured(true); flash("MOCO-Verbindung gespeichert");
  }

  // ----- Kostensätze (CHF/h, für Margen/DB) -----
  const [rates, setRates] = useState<{ default: number; perUser: Record<string, number> }>({ default: 0, perUser: {} });
  useEffect(() => {
    fetch("/api/admin/rates").then((r) => r.json()).then((d: { rates?: { default: number; perUser: Record<string, number> } }) => {
      if (d.rates) setRates(d.rates);
    }).catch(() => {});
  }, []);
  async function saveDefaultRate(value: number | null) {
    const res = await fetch("/api/admin/rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ default: value }) });
    const d = await res.json(); if (!res.ok) return flash(d.error ?? "Fehler");
    if (d.rates) setRates(d.rates); flash("Kostensatz gespeichert");
  }
  async function saveUserRate(userId: number, value: number | null) {
    const res = await fetch("/api/admin/rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, rate: value }) });
    const d = await res.json(); if (!res.ok) return flash(d.error ?? "Fehler");
    if (d.rates) setRates(d.rates); flash("Kostensatz gespeichert");
  }

  // ----- Löhne (sensibel; salary.manage) -----
  type SalaryRec = { grossMonthly: number; factor: number; sellRate: number; released: boolean; vollkosten?: number };
  const [salaries, setSalaries] = useState<Record<string, SalaryRec>>({});
  async function loadSalaries() {
    const d = await fetch("/api/admin/salaries").then((r) => r.json()).catch(() => ({}));
    if (d.salaries) setSalaries(d.salaries);
  }
  async function saveSalary(userId: number, patch: Partial<SalaryRec>) {
    const res = await fetch("/api/admin/salaries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, ...patch }) });
    const d = await res.json(); if (!res.ok) return flash(d.error ?? "Fehler");
    if (d.salaries) setSalaries(d.salaries); flash("Lohn gespeichert");
  }

  // ----- Audit-Protokoll (users.manage) -----
  type AuditEntry = { ts: string; user: string; role?: string; action: string; detail?: string };
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  async function loadAudit() {
    const d = await fetch("/api/admin/audit").then((r) => r.json()).catch(() => ({ entries: [] }));
    setAuditEntries(d.entries ?? []);
  }

  // ----- Liquidität (sensibel; liquidity.manage) -----
  type LiqMonth = { balance: number; income: number; expense: number; note?: string };
  const [liq, setLiq] = useState<{ released: boolean; months: Record<string, LiqMonth> }>({ released: false, months: {} });
  const [newLiqMonth, setNewLiqMonth] = useState("");
  async function loadLiquidity() {
    const d = await fetch("/api/admin/liquidity").then((r) => r.json()).catch(() => null);
    if (d && d.months) setLiq({ released: !!d.released, months: d.months });
  }
  async function saveLiqMonth(month: string, patch: Partial<LiqMonth> | { delete: true }) {
    const res = await fetch("/api/admin/liquidity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, ...patch }) });
    const d = await res.json(); if (!res.ok) return flash(d.error ?? "Fehler");
    if (d.months) setLiq({ released: !!d.released, months: d.months }); flash("Gespeichert");
  }
  async function toggleLiqReleased(released: boolean) {
    const res = await fetch("/api/admin/liquidity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ released }) });
    const d = await res.json(); if (!res.ok) return flash(d.error ?? "Fehler");
    if (d.months) setLiq({ released: !!d.released, months: d.months });
  }

  const cardKeys = cards.map((c) => c.key);
  const roleOf = (u: PublicUser) => roles.find((r) => r.key === u.role);
  const effCards = (u: PublicUser) => u.allowedCards ?? (roleOf(u)?.builtin ? cardKeys : []);
  const hasOverride = (u: PublicUser) => u.allowedCards != null;

  const load = useCallback(async () => {
    // Eigene Freigaben holen — bestimmt sichtbare Tabs.
    const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => ({}));
    const mc: string[] = me.capabilities ?? [];
    const authOff = me.authEnabled === false;
    setMyCaps(authOff ? ["users.manage", "roles.manage", "config.manage", "salary.manage", "liquidity.manage"] : mc);
    const may = (c: string) => authOff || mc.includes(c);

    // Rollen/Karten-Listen (für Tabs Benutzer/Rollen). Tolerant bei 403.
    if (may("users.manage") || may("roles.manage")) {
      const r = await fetch("/api/admin/roles");
      if (r.ok) { const rd = await r.json(); setRoles(rd.roles); setCaps(rd.capabilities); setCards(rd.cards); }
    }
    if (may("users.manage")) {
      const ud = await (await fetch("/api/admin/users")).json().catch(() => ({ users: [] }));
      setUsers(ud.users ?? []);
    }
    if (may("users.manage") || may("salary.manage") || may("config.manage")) {
      const md = await (await fetch("/api/admin/moco-users")).json().catch(() => ({ users: [] }));
      setMoco(md.users ?? []);
    }
    if (may("salary.manage")) loadSalaries();
    if (may("liquidity.manage")) loadLiquidity();

    // Starttab auf den ersten erlaubten setzen; gar nichts erlaubt -> denied.
    const order: [boolean, Tab][] = [
      [may("users.manage"), "users"], [may("roles.manage"), "roles"],
      [may("config.manage"), "conn"], [may("config.manage"), "rates"],
      [may("salary.manage"), "salaries"], [may("liquidity.manage"), "liquidity"],
    ];
    const first = order.find(([ok]) => ok);
    if (!first) { setDenied(true); return; }
    setTab(first[1]);
  }, []);
  useEffect(() => { load(); }, [load]);

  function flash(t: string) { setMsg(t); window.setTimeout(() => setMsg(""), 2500); }

  // ----- Benutzer -----
  const [nu, setNu] = useState({ username: "", name: "", password: "", role: "", theme: "", mocoUserId: "" });
  async function addUser() {
    const body = { ...nu, mocoUserId: nu.mocoUserId ? Number(nu.mocoUserId) : undefined, role: nu.role || roles[0]?.key };
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    if (!res.ok) return flash(d.error ?? "Fehler");
    setNu({ username: "", name: "", password: "", role: "", theme: "", mocoUserId: "" });
    flash("Benutzer angelegt"); load();
  }
  async function patchUser(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) { const d = await res.json(); return flash(d.error ?? "Fehler"); }
    load();
  }
  async function delUser(id: string) {
    if (!confirm("Benutzer wirklich löschen?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); return flash(d.error ?? "Fehler"); }
    flash("Gelöscht"); load();
  }

  // ----- Rollen -----
  const [nr, setNr] = useState<{ name: string; capabilities: string[]; cards: string[] }>({ name: "", capabilities: [], cards: [] });
  function toggle(arr: string[], k: string) { return arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]; }
  async function addRole() {
    if (!nr.name.trim()) return flash("Name nötig");
    const res = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nr) });
    if (!res.ok) { const d = await res.json(); return flash(d.error ?? "Fehler"); }
    setNr({ name: "", capabilities: [], cards: [] }); flash("Rolle angelegt"); load();
  }
  async function patchRole(key: string, patch: Partial<Role>) {
    const res = await fetch(`/api/admin/roles/${key}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) { const d = await res.json(); return flash(d.error ?? "Fehler"); }
    load();
  }
  async function delRole(key: string) {
    if (!confirm("Rolle löschen?")) return;
    const res = await fetch(`/api/admin/roles/${key}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); return flash(d.error ?? "Fehler"); }
    flash("Gelöscht"); load();
  }

  if (denied) {
    return <div className="min-h-screen flex items-center justify-center"><div className="card" style={{ fontWeight: 700, color: "var(--plum)" }}>Kein Zugriff auf die Benutzerverwaltung.</div></div>;
  }

  const roleName = (k: string) => roles.find((r) => r.key === k)?.name ?? k;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, background: "var(--holo)", backgroundSize: "220% 220%", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Benutzerverwaltung</h1>
        <a href="/" className="chip" style={{ textDecoration: "none" }}>← Dashboard</a>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canUsers && <button className={`chip ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>👤 Benutzer</button>}
          {canRoles && <button className={`chip ${tab === "roles" ? "active" : ""}`} onClick={() => setTab("roles")}>🛡️ Rollen</button>}
          {canConfig && <button className={`chip ${tab === "conn" ? "active" : ""}`} onClick={() => setTab("conn")}>🔌 Verbindung</button>}
          {canConfig && <button className={`chip ${tab === "rates" ? "active" : ""}`} onClick={() => setTab("rates")}>💸 Kostensätze</button>}
          {canSalary && <button className={`chip ${tab === "salaries" ? "active" : ""}`} onClick={() => setTab("salaries")}>💰 Löhne</button>}
          {canLiquidity && <button className={`chip ${tab === "liquidity" ? "active" : ""}`} onClick={() => setTab("liquidity")}>💧 Liquidität</button>}
          {canUsers && <button className={`chip ${tab === "audit" ? "active" : ""}`} onClick={() => { setTab("audit"); loadAudit(); }}>📋 Protokoll</button>}
        </div>
      </div>
      {msg && <div className="card" style={{ marginBottom: 16, fontWeight: 700, color: "var(--hotpink)" }}>{msg}</div>}

      {tab === "users" && (
        <>
          <section className="card" style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 17, color: "var(--plum)", marginBottom: 14 }}>Neuer Benutzer</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, alignItems: "end" }}>
              <Field label="Benutzername"><input style={input} value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} /></Field>
              <Field label="Anzeigename"><input style={input} value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></Field>
              <Field label="Passwort"><input style={input} type="password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></Field>
              <Field label="Rolle">
                <select style={input} value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>
                  <option value="">— wählen —</option>
                  {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                </select>
              </Field>
              <Field label="Theme">
                <select style={input} value={nu.theme} onChange={(e) => setNu({ ...nu, theme: e.target.value })}>
                  <option value="">Standard</option>
                  {THEMES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="MOCO-Person">
                <select style={input} value={nu.mocoUserId} onChange={(e) => setNu({ ...nu, mocoUserId: e.target.value })}>
                  <option value="">— keine —</option>
                  {moco.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <button className="chip active" style={{ height: 40, justifyContent: "center" }} onClick={addUser}>+ Anlegen</button>
            </div>
          </section>

          <section className="card">
            <h2 style={{ fontSize: 17, color: "var(--plum)", marginBottom: 14 }}>Benutzer ({users.length})</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {users.map((u) => (
                <div key={u.id} style={{ padding: "10px 0", borderBottom: "1.5px dashed var(--chip-border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr auto auto auto", gap: 10, alignItems: "center" }}>
                    <div><b style={{ color: "var(--plum)" }}>{u.name}</b><div style={{ fontSize: 12, color: "var(--plum-soft)" }}>@{u.username}</div></div>
                    <select style={input} value={u.role} onChange={(e) => patchUser(u.id, { role: e.target.value })}>
                      {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                    </select>
                    <select style={input} value={u.theme ?? ""} onChange={(e) => patchUser(u.id, { theme: e.target.value })}>
                      <option value="">Standard</option>
                      {THEMES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <select style={input} value={u.mocoUserId ?? ""} onChange={(e) => patchUser(u.id, { mocoUserId: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">MOCO: —</option>
                      {moco.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <button className={`chip ${expandedUser === u.id ? "active" : ""}`} onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
                      ⚙ Funktionen ({effCards(u).length})
                    </button>
                    <button className="chip" onClick={() => patchUser(u.id, { active: !u.active })}>{u.active ? "✓ aktiv" : "⊘ inaktiv"}</button>
                    <button className="chip" onClick={() => delUser(u.id)} style={{ color: "#c0145a" }}>🗑</button>
                  </div>

                  {expandedUser === u.id && (
                    <div style={{ marginTop: 10, padding: "12px 14px", background: "var(--input-bg)", borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                        <span style={labelS}>Freigeschaltete Funktionen für {u.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: hasOverride(u) ? "var(--hotpink)" : "var(--plum-soft)" }}>
                          {hasOverride(u) ? "individuell" : roleOf(u)?.builtin ? "Admin – alles" : "Standard – nichts"}
                        </span>
                        {hasOverride(u) && (
                          <button className="chip" style={{ padding: "3px 10px" }} onClick={() => patchUser(u.id, { allowedCards: null })}>↺ auf Standard zurück</button>
                        )}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {cards.map((c) => {
                          const on = effCards(u).includes(c.key);
                          return (
                            <button
                              key={c.key}
                              className={`chip ${on ? "active" : ""}`}
                              style={{ fontSize: 12.5 }}
                              onClick={() => {
                                const base = effCards(u);
                                const next = base.includes(c.key) ? base.filter((x) => x !== c.key) : [...base, c.key];
                                patchUser(u.id, { allowedCards: next });
                              }}
                            >
                              {on ? "✓ " : ""}{c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === "roles" && (
        <>
          <section className="card" style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 17, color: "var(--plum)", marginBottom: 14 }}>Neue Rolle</h2>
            <Field label="Name"><input style={{ ...input, maxWidth: 280 }} value={nr.name} onChange={(e) => setNr({ ...nr, name: e.target.value })} /></Field>
            <CheckGrid title="Freigaben" items={caps} selected={nr.capabilities} onToggle={(k) => setNr({ ...nr, capabilities: toggle(nr.capabilities, k) })} />
            <p style={{ fontSize: 12, color: "var(--plum-soft)", marginTop: 10 }}>Sichtbare Karten/Funktionen werden <b>pro Person</b> im Tab „Benutzer" freigeschaltet.</p>
            <button className="chip active" style={{ marginTop: 12 }} onClick={addRole}>+ Rolle anlegen</button>
          </section>

          {roles.map((role) => (
            <section className="card" key={role.key} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h3 style={{ fontSize: 16, color: "var(--plum)", fontFamily: "var(--font-heading)" }}>{role.name}</h3>
                <span style={{ fontSize: 12, color: "var(--plum-soft)" }}>({role.key})</span>
                {role.builtin && <span className="chip" style={{ padding: "3px 9px", fontSize: 11 }}>geschützt</span>}
                {!role.builtin && <button className="chip" style={{ marginLeft: "auto", color: "#c0145a" }} onClick={() => delRole(role.key)}>🗑 löschen</button>}
              </div>
              {role.builtin ? (
                <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>Admin hat immer alle Rechte.</p>
              ) : (
                <CheckGrid title="Freigaben" items={caps} selected={role.capabilities} onToggle={(k) => patchRole(role.key, { capabilities: toggle(role.capabilities, k) })} />
              )}
            </section>
          ))}
        </>
      )}

      {tab === "conn" && (
        <section className="card" style={{ maxWidth: 520 }}>
          <h2 style={{ fontSize: 17, color: "var(--plum)", marginBottom: 4 }}>MOCO-Verbindung</h2>
          <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 16 }}>
            Zentral für alle. {connConfigured ? "Aktuell verbunden." : "Noch nicht verbunden."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="MOCO-URL">
              <input style={input} value={conn.url} placeholder="https://schnyder.mocoapp.com" onChange={(e) => setConn({ ...conn, url: e.target.value })} />
            </Field>
            <Field label="Benutzername">
              <input style={input} value={conn.username} placeholder="Vorname Nachname (Admin-Login)" onChange={(e) => setConn({ ...conn, username: e.target.value })} />
            </Field>
            <Field label="API-Key">
              <input style={input} type="password" value={conn.apiKey} placeholder={connConfigured ? "Leer lassen = unverändert" : "API-Key (Admin-/Personal-Rechte)"} onChange={(e) => setConn({ ...conn, apiKey: e.target.value })} />
            </Field>
            <button className="chip active" style={{ alignSelf: "flex-start" }} onClick={saveConn}>Speichern & verbinden</button>
          </div>
        </section>
      )}

      {tab === "rates" && (
        <section className="card" style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: 17, color: "var(--plum)", marginBottom: 4 }}>Personalkostensätze (CHF / Stunde) — Fallback</h2>
          <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 16 }}>
            Wird nur genutzt, wenn für eine Person <b>kein Lohn</b> hinterlegt ist (Tab 💰 Löhne). Ist ein Lohn da,
            werden die Stundenkosten daraus berechnet (Vollkosten ÷ Soll) — keine Doppelpflege nötig.
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 20 }}>
            <Field label="Standardsatz für alle">
              <input
                style={{ ...input, maxWidth: 160 }}
                type="number" min={0} step={5}
                defaultValue={rates.default || ""}
                placeholder="z. B. 95"
                onBlur={(e) => { const v = e.target.value.trim(); saveDefaultRate(v === "" ? null : Number(v)); }}
              />
            </Field>
            <span style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600, paddingBottom: 10 }}>CHF/h · beim Verlassen des Felds gespeichert</span>
          </div>

          <div style={{ ...labelS, marginBottom: 8 }}>Pro Mitarbeiter (überschreibt Standard)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {moco.length === 0 && <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>Keine MOCO-Personen geladen (Verbindung prüfen).</p>}
            {moco.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", borderBottom: "1px dashed var(--chip-border)", paddingBottom: 8 }}>
                <span style={{ fontWeight: 700, color: "var(--plum)" }}>{m.name}</span>
                <input
                  style={{ ...input, maxWidth: 130 }}
                  type="number" min={0} step={5}
                  defaultValue={rates.perUser[String(m.id)] ?? ""}
                  placeholder={rates.default ? `Standard ${rates.default}` : "—"}
                  onBlur={(e) => { const v = e.target.value.trim(); saveUserRate(m.id, v === "" ? null : Number(v)); }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "salaries" && (
        <section className="card">
          <h2 style={{ fontSize: 17, color: "var(--plum)", marginBottom: 4 }}>💰 Löhne &amp; Wirtschaftlichkeit</h2>
          <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 16 }}>
            Sensibel — nur hier sichtbar. <b>Vollkosten = Bruttolohn × Faktor.</b> „Freigeben" macht die
            Wirtschaftlichkeit (Kosten/Umsatz, nicht den Rohlohn) für Berechtigte sichtbar. Beim Verlassen eines Felds gespeichert.
          </p>
          {moco.length === 0 && <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>Keine MOCO-Personen geladen (Verbindung prüfen).</p>}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr>
                  {["Mitarbeiter", "Bruttolohn/Mt.", "Faktor", "Vollkosten/Mt.", "Verkaufssatz CHF/h", "Freigegeben"].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: "7px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--plum-soft)", borderBottom: "1.5px solid var(--chip-border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moco.map((m) => {
                  const s = salaries[String(m.id)];
                  const vk = s ? Math.round((s.grossMonthly || 0) * (s.factor || 1)) : 0;
                  return (
                    <tr key={m.id}>
                      <td style={{ padding: "8px 8px", fontWeight: 700, color: "var(--plum)" }}>{m.name}</td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>
                        <input style={{ ...input, maxWidth: 110, textAlign: "right" }} type="number" min={0} step={100}
                          defaultValue={s?.grossMonthly || ""} placeholder="—"
                          onBlur={(e) => { const v = e.target.value.trim(); if (v !== "" || s) saveSalary(m.id, { grossMonthly: Number(v || 0) }); }} />
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>
                        <input style={{ ...input, maxWidth: 70, textAlign: "right" }} type="number" min={1} step={0.05}
                          defaultValue={s?.factor ?? 1.2}
                          onBlur={(e) => { const v = e.target.value.trim(); saveSalary(m.id, { factor: Number(v || 1.2) }); }} />
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 800, color: "var(--plum)" }}>{vk ? vk.toLocaleString("de-CH") : "—"}</td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>
                        <input style={{ ...input, maxWidth: 90, textAlign: "right" }} type="number" min={0} step={5}
                          defaultValue={s?.sellRate || ""} placeholder="—"
                          onBlur={(e) => { const v = e.target.value.trim(); if (v !== "" || s) saveSalary(m.id, { sellRate: Number(v || 0) }); }} />
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>
                        <button className={`chip ${s?.released ? "active" : ""}`} style={{ padding: "4px 10px" }}
                          onClick={() => saveSalary(m.id, { released: !(s?.released) })}>
                          {s?.released ? "✓ frei" : "gesperrt"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "liquidity" && (
        <section className="card" style={{ maxWidth: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 17, color: "var(--plum)" }}>💧 Liquidität</h2>
            <button className={`chip ${liq.released ? "active" : ""}`} style={{ marginLeft: "auto" }}
              onClick={() => toggleLiqReleased(!liq.released)}>
              {liq.released ? "✓ freigegeben" : "freigeben"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 16 }}>
            Monatswerte erfassen. „Freigeben" macht die Tabelle für Berechtigte (Liquidität sehen) sichtbar.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 14 }}>
            <Field label="Monat hinzufügen">
              <input style={{ ...input, maxWidth: 160 }} type="month" value={newLiqMonth} onChange={(e) => setNewLiqMonth(e.target.value)} />
            </Field>
            <button className="chip active" style={{ height: 38 }} onClick={() => { if (newLiqMonth) { saveLiqMonth(newLiqMonth, { balance: 0, income: 0, expense: 0 }); setNewLiqMonth(""); } }}>+ Anlegen</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr>
                  {["Monat", "Kontostand", "Einnahmen", "Ausgaben", ""].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: "7px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--plum-soft)", borderBottom: "1.5px solid var(--chip-border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(liq.months).sort().reverse().map((mk) => {
                  const v = liq.months[mk];
                  const numField = (field: "balance" | "income" | "expense") => (
                    <input style={{ ...input, maxWidth: 120, textAlign: "right" }} type="number" step={100}
                      defaultValue={v[field] || 0}
                      onBlur={(e) => saveLiqMonth(mk, { [field]: Number(e.target.value || 0) })} />
                  );
                  return (
                    <tr key={mk}>
                      <td style={{ padding: "8px 8px", fontWeight: 700, color: "var(--plum)" }}>{mk}</td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>{numField("balance")}</td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>{numField("income")}</td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>{numField("expense")}</td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>
                        <button className="chip" style={{ padding: "3px 9px", color: "#c0145a" }} onClick={() => { if (confirm("Monat löschen?")) saveLiqMonth(mk, { delete: true }); }}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "audit" && (
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h2 style={{ fontSize: 17, color: "var(--plum)" }}>📋 Zugriffsprotokoll</h2>
            <button className="chip" style={{ marginLeft: "auto" }} onClick={loadAudit}>↻ aktualisieren</button>
          </div>
          <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 16 }}>
            Wer hat sensible Daten (Löhne/Liquidität) gesehen oder geändert. Neueste zuerst.
          </p>
          {auditEntries.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>Noch keine Einträge.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["Zeit", "Benutzer", "Aktion", "Detail"].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "7px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--plum-soft)", borderBottom: "1.5px solid var(--chip-border)" }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {auditEntries.map((e, i) => (
                    <tr key={i}>
                      <td style={{ padding: "7px 8px", color: "var(--plum-soft)", whiteSpace: "nowrap" }}>{new Date(e.ts).toLocaleString("de-CH")}</td>
                      <td style={{ padding: "7px 8px", fontWeight: 700, color: "var(--plum)" }}>{e.user}{e.role ? ` (${e.role})` : ""}</td>
                      <td style={{ padding: "7px 8px" }}><span style={{ fontWeight: 700, color: e.action.includes("change") || e.action.includes("delete") || e.action.includes("release") ? "#c0145a" : "var(--plum)" }}>{e.action}</span></td>
                      <td style={{ padding: "7px 8px", color: "var(--plum-soft)" }}>{e.detail ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={labelS}>{label}</span>{children}</label>;
}

function CheckGrid({ title, items, selected, onToggle }: { title: string; items: Cap[]; selected: string[]; onToggle: (k: string) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...labelS, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((it) => {
          const on = selected.includes(it.key);
          return (
            <button key={it.key} onClick={() => onToggle(it.key)} className={`chip ${on ? "active" : ""}`} style={{ fontSize: 12.5 }}>
              {on ? "✓ " : ""}{it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
