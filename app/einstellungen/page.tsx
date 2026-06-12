"use client";

import { useEffect, useState } from "react";
import { readAI, writeAI, hasNativeBridge, nativeAction, type AIConfig, type AIMode } from "@/lib/aiConfig";

const OLLAMA = "http://localhost:11434";

const card: React.CSSProperties = { };
const input: React.CSSProperties = {
  borderRadius: 12, border: "1.5px solid var(--chip-border)", background: "var(--input-bg)",
  color: "var(--plum)", fontFamily: "var(--font-body)", padding: "9px 12px", fontWeight: 600, outline: "none", width: "100%",
};
const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--plum-soft)" };

export default function EinstellungenPage() {
  const [cfg, setCfg] = useState<AIConfig | null>(null);
  const [native, setNative] = useState(false);
  const [ollama, setOllama] = useState<{ running: boolean; models: string[] }>({ running: false, models: [] });
  const [msg, setMsg] = useState("");

  useEffect(() => { setCfg(readAI()); setNative(hasNativeBridge()); checkOllama(); }, []);

  function checkOllama() {
    fetch(`${OLLAMA}/api/tags`)
      .then((r) => r.json())
      .then((d: { models?: { name: string }[] }) => setOllama({ running: true, models: (d.models ?? []).map((m) => m.name) }))
      .catch(() => setOllama({ running: false, models: [] }));
  }

  function save(next: AIConfig) { setCfg(next); writeAI(next); flash("Gespeichert ✓"); }
  function flash(t: string) { setMsg(t); window.setTimeout(() => setMsg(""), 2200); }

  if (!cfg) return null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, background: "var(--holo)", backgroundSize: "220% 220%", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Einstellungen</h1>
        <a href="/" className="chip" style={{ textDecoration: "none" }}>← Dashboard</a>
      </div>
      {msg && <div className="card" style={{ marginBottom: 16, fontWeight: 700, color: "var(--hotpink)" }}>{msg}</div>}

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 4 }}>🤖 KI für Loco-Chat</h2>
        <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 16 }}>
          Gilt nur für dieses Gerät. Wähle, womit Loco-Chat denkt.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {([["ollama", "🖥️ Lokal (Ollama)"], ["cloud", "☁️ Cloud-API"], ["off", "⊘ Aus"]] as [AIMode, string][]).map(([m, label]) => (
            <button key={m} className={`chip ${cfg.mode === m ? "active" : ""}`} onClick={() => save({ ...cfg, mode: m })}>{label}</button>
          ))}
        </div>

        {cfg.mode === "ollama" && (
          <div style={{ ...card }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, color: ollama.running ? "#0a8a4a" : "#c0145a" }}>
                {ollama.running ? "● Ollama läuft" : "○ Ollama nicht erreichbar"}
              </span>
              {ollama.running && <span style={{ fontSize: 12.5, color: "var(--plum-soft)", fontWeight: 600 }}>Modelle: {ollama.models.join(", ") || "keine"}</span>}
              <button className="chip" style={{ marginLeft: "auto", padding: "4px 10px" }} onClick={checkOllama}>↻ prüfen</button>
            </div>

            <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600, marginBottom: 10 }}>
              Läuft komplett auf diesem Gerät — keine Cloud, keine Kosten, sensible Daten bleiben lokal.
            </p>

            {native ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="chip active" onClick={() => { nativeAction("installOllama"); flash("Installation gestartet — lädt im Hintergrund (1–5 Min), danach erneut prüfen."); }}>⬇︎ Ollama installieren / Modell laden</button>
                <button className="chip" style={{ color: "#c0145a" }} onClick={() => { if (confirm("Ollama + Modelle entfernen?")) { nativeAction("uninstallOllama"); flash("Deinstallation gestartet."); } }}>🗑 Deinstallieren</button>
              </div>
            ) : (
              <div style={{ background: "var(--input-bg)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ ...labelS, marginBottom: 6 }}>Installieren (im Terminal)</div>
                <code style={{ fontSize: 12.5, color: "var(--plum)", wordBreak: "break-all" }}>brew install ollama && ollama pull qwen2.5:7b</code>
                <div style={{ ...labelS, margin: "10px 0 6px" }}>Deinstallieren</div>
                <code style={{ fontSize: 12.5, color: "var(--plum)", wordBreak: "break-all" }}>brew uninstall ollama</code>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <span style={labelS}>Modell (optional, sonst automatisch)</span>
              <input style={{ ...input, maxWidth: 240, marginTop: 5 }} placeholder="qwen2.5:7b" defaultValue={cfg.ollamaModel ?? ""}
                onBlur={(e) => save({ ...cfg, ollamaModel: e.target.value.trim() || undefined })} />
            </div>
          </div>
        )}

        {cfg.mode === "cloud" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>
              OpenAI-kompatible API. ⚠️ Hinweis: Dabei verlassen die abgefragten Daten dein Gerät Richtung Anbieter — für Löhne/Sensibles besser „Lokal".
            </p>
            <label><span style={labelS}>API-Adresse (Base-URL)</span>
              <input style={{ ...input, marginTop: 5 }} placeholder="https://api.openai.com/v1" defaultValue={cfg.cloud.baseUrl}
                onBlur={(e) => save({ ...cfg, cloud: { ...cfg.cloud, baseUrl: e.target.value.trim() } })} /></label>
            <label><span style={labelS}>API-Key</span>
              <input style={{ ...input, marginTop: 5 }} type="password" placeholder="sk-…" defaultValue={cfg.cloud.apiKey}
                onBlur={(e) => save({ ...cfg, cloud: { ...cfg.cloud, apiKey: e.target.value.trim() } })} /></label>
            <label><span style={labelS}>Modell</span>
              <input style={{ ...input, maxWidth: 240, marginTop: 5 }} placeholder="gpt-4o-mini" defaultValue={cfg.cloud.model}
                onBlur={(e) => save({ ...cfg, cloud: { ...cfg.cloud, model: e.target.value.trim() } })} /></label>
          </div>
        )}

        {cfg.mode === "off" && (
          <p style={{ fontSize: 13, color: "var(--plum-soft)", fontWeight: 600 }}>Loco-Chat ist auf diesem Gerät deaktiviert.</p>
        )}
      </section>
    </div>
  );
}
