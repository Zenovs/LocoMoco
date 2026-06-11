"use client";

import { useEffect, useState } from "react";

interface Props {
  onSuccess: () => void;
}

const labelStyle: React.CSSProperties = {
  color: "var(--plum-soft)",
  fontFamily: "var(--font-heading)",
};

const inputStyle: React.CSSProperties = {
  borderRadius: "16px",
  border: "1.5px solid var(--chip-border)",
  background: "rgba(255,255,255,.7)",
  color: "var(--plum)",
  fontFamily: "var(--font-body)",
};

export default function SetupScreen({ onSuccess }: Props) {
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [reconfigure, setReconfigure] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [error, setError] = useState("");

  // Theme
  const [theme, setTheme] = useState("girly");
  const [themes, setThemes] = useState<string[]>(["girly", "pro", "ocean"]);
  useEffect(() => {
    fetch("/api/theme")
      .then((r) => r.json())
      .then((d: { theme?: string; available?: string[] }) => {
        if (d.theme) setTheme(d.theme);
        if (d.available) setThemes(d.available);
      })
      .catch(() => {});
  }, []);

  function changeTheme(next: string) {
    setTheme(next);
    document.documentElement.dataset.theme = next; // Live-Vorschau
    fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  }

  const THEME_LABELS: Record<string, string> = {
    girly: "Girly ✨ (verspielt, rosa)",
    pro: "Pro (clean, professionell)",
    ocean: "Ocean (ruhiges Blau/Türkis)",
  };

  // Bestehende Einstellungen vorbefüllen (wenn als Einstellungen geöffnet)
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { configured: boolean; subdomain?: string; username?: string }) => {
        if (d.configured) {
          setReconfigure(true);
          if (d.subdomain) setUrl(`https://${d.subdomain}.mocoapp.com`);
          if (d.username) setUsername(d.username);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, username, apiKey }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Etwas ist schiefgelaufen.");
        setStatus("error");
      } else {
        setStatus("ok");
        setTimeout(onSuccess, 800);
      }
    } catch {
      setError("Keine Verbindung zum Server.");
      setStatus("error");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ position: "relative" }}
    >
      <div className="card w-full max-w-md" style={{ zIndex: 1 }}>
        <div className="text-center mb-8">
          <h1
            className="text-5xl mb-2"
            style={{
              fontFamily: "var(--font-display)",
              background: "var(--holo)",
              backgroundSize: "220% 220%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "shimmer 5s ease-in-out infinite",
              filter: "drop-shadow(0 3px 10px rgba(255,79,163,.35))",
            }}
          >
            Loco Moco
          </h1>
          <p style={{ color: "var(--plum-soft)", fontWeight: 600 }}>
            {reconfigure ? (
              <>deine <span style={{ color: "var(--hotpink)" }}>Einstellungen</span> ✨</>
            ) : (
              <>deine Zeiterfassung, aber <span style={{ color: "var(--hotpink)" }}>fabelhaft</span> ✨</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* MOCO URL */}
          <div>
            <label htmlFor="url" className="block text-sm font-semibold mb-1.5" style={labelStyle}>
              MOCO-URL
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://schnyder.mocoapp.com"
              required
              autoComplete="off"
              className="w-full px-4 py-3 font-semibold outline-none"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: "var(--plum-soft)" }}>
              Volle Adresse oder nur die Subdomain (z. B. <b>schnyder</b>).
            </p>
          </div>

          {/* Benutzername */}
          <div>
            <label htmlFor="username" className="block text-sm font-semibold mb-1.5" style={labelStyle}>
              Benutzername
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Vorname Nachname (dein MOCO-Login)"
              autoComplete="off"
              className="w-full px-4 py-3 font-semibold outline-none"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: "var(--plum-soft)" }}>
              Wird genutzt, um dein Dashboard standardmäßig auf dich zu setzen.
            </p>
          </div>

          {/* API-Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-semibold mb-1.5" style={labelStyle}>
              API-Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={reconfigure ? "Leer lassen = unverändert" : "Aus MOCO → Profil → Integrations"}
              required={!reconfigure}
              autoComplete="off"
              className="w-full px-4 py-3 font-semibold outline-none"
              style={inputStyle}
            />
          </div>

          {/* Theme */}
          <div>
            <label htmlFor="theme" className="block text-sm font-semibold mb-1.5" style={labelStyle}>
              Theme
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => changeTheme(e.target.value)}
              className="w-full px-4 py-3 font-semibold outline-none"
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
            >
              {themes.map((t) => (
                <option key={t} value={t}>{THEME_LABELS[t] ?? t}</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: "var(--plum-soft)" }}>
              Ändert sich sofort. (Zentral pro Person zuweisbar, sobald der Server-Modus steht.)
            </p>
          </div>

          {error && (
            <div
              className="rounded-2xl px-4 py-3 text-sm font-semibold"
              style={{ background: "rgba(255,46,149,.08)", color: "#c0145a", border: "1.5px solid rgba(255,46,149,.2)" }}
            >
              {error}
            </div>
          )}

          {status === "ok" && (
            <div
              className="rounded-2xl px-4 py-3 text-sm font-semibold"
              style={{ background: "rgba(0,200,100,.08)", color: "#0a7c3e", border: "1.5px solid rgba(0,200,100,.2)" }}
            >
              Gespeichert ✅
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading" || status === "ok"}
            className="w-full py-3.5 font-bold text-white transition-all disabled:opacity-60"
            style={{
              borderRadius: "16px",
              fontFamily: "var(--font-heading)",
              fontSize: "1.1rem",
              background: "var(--accent-grad)",
              boxShadow: "0 8px 28px -6px rgba(255,46,149,.55)",
            }}
          >
            {status === "loading"
              ? "Verbinde…"
              : reconfigure
              ? "Speichern 💖"
              : "Los geht's 💖"}
          </button>
        </form>
      </div>
    </div>
  );
}
