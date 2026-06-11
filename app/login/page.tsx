"use client";

import { useEffect, useState } from "react";

const inputStyle: React.CSSProperties = {
  borderRadius: "16px",
  border: "1.5px solid var(--chip-border)",
  background: "var(--input-bg)",
  color: "var(--plum)",
  fontFamily: "var(--font-body)",
};

export default function LoginPage() {
  const [mode, setMode] = useState<"loading" | "login" | "setup">("loading");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/needs-setup")
      .then((r) => r.json())
      .then((d: { needsSetup: boolean }) => setMode(d.needsSetup ? "setup" : "login"))
      .catch(() => setMode("login"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const endpoint = mode === "setup" ? "/api/auth/setup" : "/api/auth/login";
    const payload = mode === "setup" ? { username, name, password } : { username, password };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Fehlgeschlagen.");
        setBusy(false);
        return;
      }
      const from = new URLSearchParams(window.location.search).get("from") || "/";
      window.location.href = from;
    } catch {
      setError("Keine Verbindung zum Server.");
      setBusy(false);
    }
  }

  const isSetup = mode === "setup";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ position: "relative" }}>
      <div className="card w-full max-w-sm" style={{ zIndex: 1 }}>
        <div className="text-center mb-7">
          <h1
            className="text-4xl mb-1"
            style={{
              fontFamily: "var(--font-display)",
              background: "var(--holo)",
              backgroundSize: "220% 220%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "shimmer 5s ease-in-out infinite",
            }}
          >
            Loco Moco
          </h1>
          <p style={{ color: "var(--plum-soft)", fontWeight: 600, fontSize: 14 }}>
            {mode === "loading" ? "…" : isSetup ? "Ersten Admin anlegen" : "Bitte anmelden"}
          </p>
        </div>

        {mode !== "loading" && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Benutzername"
              autoComplete="username"
              required
              autoFocus
              className="w-full px-4 py-3 font-semibold outline-none"
              style={inputStyle}
            />
            {isSetup && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Anzeigename (z. B. Vorname Nachname)"
                className="w-full px-4 py-3 font-semibold outline-none"
                style={inputStyle}
              />
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSetup ? "Passwort (min. 6 Zeichen)" : "Passwort"}
              autoComplete={isSetup ? "new-password" : "current-password"}
              required
              className="w-full px-4 py-3 font-semibold outline-none"
              style={inputStyle}
            />

            {error && (
              <div
                className="rounded-2xl px-4 py-2.5 text-sm font-semibold"
                style={{ background: "rgba(220,40,90,.08)", color: "#c0145a", border: "1.5px solid rgba(220,40,90,.2)" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 font-bold text-white transition-all disabled:opacity-60"
              style={{
                borderRadius: "16px",
                fontFamily: "var(--font-heading)",
                fontSize: "1.05rem",
                background: "var(--accent-grad)",
                boxShadow: "0 8px 28px -6px var(--glow)",
              }}
            >
              {busy ? "…" : isSetup ? "Admin anlegen & einloggen" : "Anmelden"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
