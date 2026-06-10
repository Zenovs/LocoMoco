"use client";

import { useState } from "react";

interface Props {
  onSuccess: () => void;
}

export default function SetupScreen({ onSuccess }: Props) {
  const [subdomain, setSubdomain] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain, apiKey }),
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
              fontFamily: "Pacifico, cursive",
              background: "linear-gradient(110deg,#ff8fd0 0%,#c9a7ff 30%,#a9d8ff 55%,#ffd86b 78%,#ff8fd0 100%)",
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
            deine Zeiterfassung, aber <span style={{ color: "var(--hotpink)" }}>fabelhaft</span> ✨
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="subdomain"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: "var(--plum-soft)", fontFamily: "Fredoka, sans-serif" }}
            >
              Subdomain
            </label>
            <div
              className="flex items-center overflow-hidden"
              style={{
                borderRadius: "16px",
                border: "1.5px solid #ffc4e3",
                background: "rgba(255,255,255,.7)",
              }}
            >
              <input
                id="subdomain"
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="schnyder"
                required
                className="flex-1 px-4 py-3 outline-none font-semibold"
                style={{ background: "transparent", color: "var(--plum)", fontFamily: "Quicksand, sans-serif" }}
              />
              <span
                className="px-4 py-3 text-sm font-bold whitespace-nowrap"
                style={{ background: "#ffe3f1", color: "var(--hotpink)" }}
              >
                .mocoapp.com
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: "var(--plum-soft)", fontFamily: "Fredoka, sans-serif" }}
            >
              API-Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Aus MOCO → Profil → Integrations"
              required
              className="w-full px-4 py-3 font-semibold outline-none"
              style={{
                borderRadius: "16px",
                border: "1.5px solid #ffc4e3",
                background: "rgba(255,255,255,.7)",
                color: "var(--plum)",
                fontFamily: "Quicksand, sans-serif",
              }}
            />
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
              Verbunden ✅
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading" || status === "ok"}
            className="w-full py-3.5 font-bold text-white transition-all disabled:opacity-60"
            style={{
              borderRadius: "16px",
              fontFamily: "Fredoka, sans-serif",
              fontSize: "1.1rem",
              background: "linear-gradient(110deg,#ff8fd0 0%,#ff2e95 50%,#c9a7ff 100%)",
              boxShadow: "0 8px 28px -6px rgba(255,46,149,.55)",
            }}
          >
            {status === "loading" ? "Verbinde…" : "Los geht's 💖"}
          </button>
        </form>
      </div>
    </div>
  );
}
