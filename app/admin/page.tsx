"use client";

import { useEffect, useState, useCallback } from "react";

interface Role { key: string; name: string; builtin?: boolean; capabilities: string[]; cards: string[]; }
interface Cap { key: string; label: string; }
interface PublicUser { id: string; username: string; name: string; role: string; theme?: string; mocoUserId?: number; active: boolean; }
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
  borderRadius: 12, border: "1.5px solid var(--chip-border)", background: "rgba(255,255,255,.7)",
  color: "var(--plum)", fontFamily: "var(--font-body)", padding: "8px 12px", fontWeight: 600, outline: "none",
};
const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--plum-soft)" };

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [denied, setDenied] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [caps, setCaps] = useState<Cap[]>([]);
  const [cards, setCards] = useState<Cap[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [moco, setMoco] = useState<MocoPerson[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/roles");
    if (r.status === 403 || r.status === 401) { setDenied(true); return; }
    const rd = await r.json();
    setRoles(rd.roles); setCaps(rd.capabilities); setCards(rd.cards);
    const ud = await (await fetch("/api/admin/users")).json();
    setUsers(ud.users ?? []);
    const md = await (await fetch("/api/admin/moco-users")).json().catch(() => ({ users: [] }));
    setMoco(md.users ?? []);
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
    return <div className="min-h-screen flex items-center justify-center"><div className="card" style={{ fontWeight: 700, color: "var(--plum)" }}>Kein Zugriff auf das Admin-Panel.</div></div>;
  }

  const roleName = (k: string) => roles.find((r) => r.key === k)?.name ?? k;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, background: "var(--holo)", backgroundSize: "220% 220%", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Admin-Panel</h1>
        <a href="/" className="chip" style={{ textDecoration: "none" }}>← Dashboard</a>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className={`chip ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>👤 Benutzer</button>
          <button className={`chip ${tab === "roles" ? "active" : ""}`} onClick={() => setTab("roles")}>🛡️ Rollen</button>
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
                <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr auto auto", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1.5px dashed var(--chip-border)" }}>
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
                  <button className="chip" onClick={() => patchUser(u.id, { active: !u.active })}>{u.active ? "✓ aktiv" : "⊘ inaktiv"}</button>
                  <button className="chip" onClick={() => delUser(u.id)} style={{ color: "#c0145a" }}>🗑</button>
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
            <CheckGrid title="Sichtbare Karten" items={cards} selected={nr.cards} onToggle={(k) => setNr({ ...nr, cards: toggle(nr.cards, k) })} />
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
                <>
                  <CheckGrid title="Freigaben" items={caps} selected={role.capabilities} onToggle={(k) => patchRole(role.key, { capabilities: toggle(role.capabilities, k) })} />
                  <CheckGrid title="Sichtbare Karten" items={cards} selected={role.cards} onToggle={(k) => patchRole(role.key, { cards: toggle(role.cards, k) })} />
                </>
              )}
            </section>
          ))}
        </>
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
