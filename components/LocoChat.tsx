"use client";

import { useEffect, useRef, useState } from "react";
import { readAI, type AIConfig } from "@/lib/aiConfig";

// Lokales LLM über Ollama (auf dem Gerät) ODER eine Cloud-API (OpenAI-kompatibel)
// — je nach Einstellung (pro Gerät, /einstellungen).
const OLLAMA = "http://localhost:11434";
const PREFERRED = ["qwen2.5:7b", "qwen2.5:7b-instruct", "llama3.1:8b", "qwen2.5:3b", "llama3.2:3b"];
const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

interface NeutralCall { id: string; name: string; args: Record<string, unknown>; }
interface NeutralMsg { role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: NeutralCall[]; tool_call_id?: string; }

const TOOLS = [
  { type: "function", function: { name: "list_employees", description: "Listet alle aktiven Mitarbeitenden (Name + ID). Nutze das, um einen Namen aufzulösen.", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "get_employee_productivity", description: "Produktivität, verrechenbare und erfasste Stunden einer Person in einem Monat.", parameters: { type: "object", properties: { name: { type: "string", description: "Name der Person, z. B. 'Dario'" }, year: { type: "number" }, month: { type: "number", description: "1-12" } }, required: ["name", "year", "month"] } } },
  { type: "function", function: { name: "get_company_overview", description: "Firmenweite Kennzahlen eines Monats: Auslastung, Verrechenbarkeit, (falls verfügbar) Umsatz.", parameters: { type: "object", properties: { year: { type: "number" }, month: { type: "number" } }, required: ["year", "month"] } } },
  { type: "function", function: { name: "get_wirtschaftlichkeit", description: "Kosten, erwirtschafteter Umsatz und Deckungsbeitrag pro Mitarbeiter (nur mit Lohn-Leserecht).", parameters: { type: "object", properties: { year: { type: "number" }, month: { type: "number" } }, required: ["year", "month"] } } },
  { type: "function", function: { name: "get_hours_check", description: "Erfassungs-Check einer Person: Soll vs. erfasste Stunden, vergessene Tage, berücksichtigte Ferien/Krankheit.", parameters: { type: "object", properties: { name: { type: "string" }, year: { type: "number" }, month: { type: "number" } }, required: ["name", "year", "month"] } } },
  { type: "function", function: { name: "get_sleeping_projects", description: "Projekte ohne Aktivität seit längerem (Schläferprojekte), inkl. Kunde und letzter Buchung.", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "get_project_status", description: "Projektstatus-Übersicht eines Monats: aktiv, über Budget, fast am Budget, ohne Aktivität, Termin überschritten.", parameters: { type: "object", properties: { year: { type: "number" }, month: { type: "number" } }, required: ["year", "month"] } } },
  { type: "function", function: { name: "get_warnings", description: "Alle aktuellen Frühwarnungen (Budget, Verrechenbarkeit, überfällige Rechnungen, negativer DB usw.) eines Monats.", parameters: { type: "object", properties: { year: { type: "number" }, month: { type: "number" } }, required: ["year", "month"] } } },
];

let employeeCache: { id: number; name: string }[] | null = null;
async function loadEmployees(): Promise<{ id: number; name: string }[]> {
  if (employeeCache) return employeeCache;
  const list = (await fetch("/api/users").then((r) => r.json())) as { id: number; firstname: string; lastname: string; active: boolean }[];
  employeeCache = (list ?? []).filter((u) => u.active).map((u) => ({ id: u.id, name: `${u.firstname} ${u.lastname}`.trim() }));
  return employeeCache;
}
function matchEmployee(emps: { id: number; name: string }[], q: string) {
  const s = q.trim().toLowerCase();
  return emps.find((e) => e.name.toLowerCase() === s) ?? emps.find((e) => e.name.toLowerCase().includes(s));
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    if (name === "list_employees") return await loadEmployees();
    if (name === "get_employee_productivity") {
      const nm = String(args.name ?? "").trim();
      if (!nm) return { error: "Bitte den Namen der Person angeben (frag ggf. nach)." };
      const emps = await loadEmployees();
      const u = matchEmployee(emps, nm);
      if (!u) return { error: `Mitarbeiter '${nm}' nicht gefunden. Verfügbar: ${emps.map((e) => e.name).join(", ")}` };
      const d = await fetch(`/api/month?userId=${u.id}&year=${args.year}&month=${args.month}`).then((r) => r.json());
      if (d.error) return { error: d.error };
      const p = d.productivity ?? {};
      return { employee: u.name, year: args.year, month: args.month, productivityPct: p.productivityPct, billableHours: p.billableHours, recordedHours: p.totalHours, internalHours: p.internalHours };
    }
    if (name === "get_company_overview") {
      const r = await fetch(`/api/company?year=${args.year}&month=${args.month}`);
      if (r.status === 403) return { error: "Keine Berechtigung für firmenweite Daten." };
      const d = await r.json();
      if (d.error) return { error: d.error };
      return { utilization: d.utilization, revenue: d.finance?.revenue ?? null, employees: (d.employees ?? []).length };
    }
    if (name === "get_wirtschaftlichkeit") {
      const r = await fetch(`/api/wirtschaftlichkeit?year=${args.year}&month=${args.month}`);
      if (r.status === 403) return { error: "Keine Berechtigung, Löhne/Wirtschaftlichkeit zu sehen." };
      const d = await r.json();
      if (d.error) return { error: d.error };
      return { people: d.people ?? [], hint: d.hint };
    }
    if (name === "get_hours_check") {
      const nm = String(args.name ?? "").trim();
      if (!nm) return { error: "Bitte den Namen der Person angeben." };
      const emps = await loadEmployees();
      const u = matchEmployee(emps, nm);
      if (!u) return { error: `Mitarbeiter '${nm}' nicht gefunden.` };
      const d = await fetch(`/api/dashboard?userId=${u.id}&year=${args.year}&month=${args.month}`).then((r) => r.json());
      if (d.error) return { error: d.error };
      const h = d.hoursCheck ?? {};
      return { employee: u.name, sollHours: h.expectedToDate, recordedHours: h.recorded, deltaHours: h.delta, forgottenDays: h.missingDays, absenceDays: h.absenceDays, absenceHours: h.absenceHours };
    }
    if (name === "get_sleeping_projects") {
      const r = await fetch(`/api/sleeping`);
      if (r.status === 403) return { error: "Keine Berechtigung für firmenweite Projektdaten." };
      const d = await r.json();
      if (d.error) return { error: d.error };
      return { sleeping: (d.sleeping ?? []).slice(0, 20) };
    }
    if (name === "get_project_status") {
      const r = await fetch(`/api/company?year=${args.year}&month=${args.month}`);
      if (r.status === 403) return { error: "Keine Berechtigung für firmenweite Daten." };
      const d = await r.json();
      if (d.error) return { error: d.error };
      return { status: d.projectStatus, topOverBudget: (d.projects ?? []).filter((p: { hoursOver: number }) => p.hoursOver > 0).slice(0, 8) };
    }
    if (name === "get_warnings") {
      const r = await fetch(`/api/company?year=${args.year}&month=${args.month}`);
      if (r.status === 403) return { error: "Keine Berechtigung für firmenweite Daten." };
      const d = await r.json();
      if (d.error) return { error: d.error };
      return { warnings: d.warnings ?? [] };
    }
    return { error: `Unbekanntes Tool: ${name}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Tool-Fehler" };
  }
}

// --- Backend-Aufruf: vereinheitlicht Ollama und OpenAI-kompatible Cloud-APIs ---
async function callLLM(cfg: AIConfig, model: string, convo: NeutralMsg[]): Promise<NeutralMsg> {
  if (cfg.mode === "cloud") {
    const messages = convo.map((m) => {
      if (m.role === "assistant" && m.tool_calls) {
        return { role: "assistant", content: m.content || null, tool_calls: m.tool_calls.map((t) => ({ id: t.id, type: "function", function: { name: t.name, arguments: JSON.stringify(t.args) } })) };
      }
      if (m.role === "tool") return { role: "tool", tool_call_id: m.tool_call_id, content: m.content };
      return { role: m.role, content: m.content };
    });
    const res = await fetch(`${cfg.cloud.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.cloud.apiKey}` },
      body: JSON.stringify({ model: cfg.cloud.model, messages, tools: TOOLS, tool_choice: "auto" }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const m = (await res.json()).choices?.[0]?.message ?? {};
    return { role: "assistant", content: m.content ?? "", tool_calls: (m.tool_calls ?? []).map((tc: { id: string; function: { name: string; arguments: string } }) => ({ id: tc.id, name: tc.function.name, args: safeParse(tc.function.arguments) })) };
  }
  // Ollama
  const messages = convo.map((m) => {
    if (m.role === "assistant" && m.tool_calls) return { role: "assistant", content: m.content, tool_calls: m.tool_calls.map((t) => ({ function: { name: t.name, arguments: t.args } })) };
    return { role: m.role, content: m.content };
  });
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages, tools: TOOLS, stream: false }) });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const m = (await res.json()).message ?? {};
  return { role: "assistant", content: m.content ?? "", tool_calls: (m.tool_calls ?? []).map((tc: { function: { name: string; arguments: Record<string, unknown> } }, i: number) => ({ id: `call_${i}`, name: tc.function.name, args: tc.function.arguments ?? {} })) };
}
function safeParse(s: string): Record<string, unknown> { try { return JSON.parse(s || "{}"); } catch { return {}; } }

export default function LocoChat({ defaultYear, defaultMonth }: { defaultYear: number; defaultMonth: number }) {
  const [cfg, setCfg] = useState<AIConfig | null>(null);
  const [status, setStatus] = useState<"checking" | "ready" | "no-ollama" | "no-model" | "off" | "no-key">("checking");
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = readAI(); setCfg(c);
    if (c.mode === "off") { setStatus("off"); return; }
    if (c.mode === "cloud") { setStatus(c.cloud.apiKey ? "ready" : "no-key"); setModel(c.cloud.model); return; }
    fetch(`${OLLAMA}/api/tags`).then((r) => r.json()).then((d: { models?: { name: string }[] }) => {
      const names = (d.models ?? []).map((m) => m.name);
      if (names.length === 0) { setStatus("no-model"); return; }
      setModel(c.ollamaModel && names.includes(c.ollamaModel) ? c.ollamaModel : PREFERRED.find((p) => names.includes(p)) ?? names[0]);
      setStatus("ready");
    }).catch(() => setStatus("no-ollama"));
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const systemPrompt = `Du bist Loco-Chat im Zeiterfassungs-Tool Loco Moco. Beantworte Fragen zu Mitarbeitenden, Produktivität, Auslastung und (falls erlaubt) Wirtschaftlichkeit. Nutze IMMER die Tools für echte Zahlen — erfinde nie Werte. Fehlt Monat/Jahr, nimm Monat ${defaultMonth} (${MONTHS_DE[defaultMonth - 1]}), Jahr ${defaultYear}. Antworte knapp auf Deutsch mit konkreten Zahlen. Bekommt ein Tool "error: Keine Berechtigung", sag freundlich, dass dafür die Freigabe fehlt.`;

  async function send() {
    const q = input.trim();
    if (!q || busy || status !== "ready" || !cfg) return;
    setInput(""); setMessages((m) => [...m, { role: "user", content: q }]); setBusy(true);

    let useModel = model;
    if (cfg.mode === "ollama") {
      try {
        const names: string[] = (await fetch(`${OLLAMA}/api/tags`).then((r) => r.json())).models?.map((m: { name: string }) => m.name) ?? [];
        if (names.length) { useModel = cfg.ollamaModel && names.includes(cfg.ollamaModel) ? cfg.ollamaModel : PREFERRED.find((p) => names.includes(p)) ?? names[0]; if (useModel !== model) setModel(useModel); }
      } catch { /* offline */ }
    }

    const convo: NeutralMsg[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content }) as NeutralMsg),
      { role: "user", content: q },
    ];

    try {
      for (let step = 0; step < 6; step++) {
        const reply = await callLLM(cfg, useModel, convo);
        convo.push(reply);
        if (reply.tool_calls && reply.tool_calls.length > 0) {
          for (const tc of reply.tool_calls) {
            const result = await executeTool(tc.name, tc.args);
            convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
          }
          continue;
        }
        setMessages((m) => [...m, { role: "assistant", content: reply.content || "(keine Antwort)" }]);
        break;
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ Fehler: ${e instanceof Error ? e.message : "unbekannt"}. ${cfg.mode === "cloud" ? "API-Adresse/Key prüfen (Einstellungen)." : "Läuft Ollama? (Einstellungen)"}` }]);
    } finally { setBusy(false); }
  }

  const modelLabel = cfg?.mode === "cloud" ? `Cloud · ${model}` : `lokal${model ? ` · ${model}` : ""}`;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 360 }}>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 17, color: "var(--plum)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🤖</span> Loco-Chat <span style={{ fontSize: 11, fontWeight: 700, color: "var(--plum-soft)" }}>· {modelLabel}</span>
          </h3>
          <p style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600, margin: "4px 0 0" }}>Frag z. B. „Wie produktiv war Dario im Juni?"</p>
        </div>
        <a href="/einstellungen" className="chip" style={{ textDecoration: "none", fontSize: 12.5 }}>⚙️ KI</a>
      </div>

      {status === "checking" && <Empty text="Prüfe KI…" />}
      {status === "off" && <Notice title="KI ist aus" body="Loco-Chat ist auf diesem Gerät deaktiviert. Unter ⚙️ KI aktivierbar." />}
      {status === "no-key" && <Notice title="Kein API-Key" body="Cloud-Modus gewählt, aber kein API-Key hinterlegt. Unter ⚙️ KI eintragen." />}
      {status === "no-ollama" && <Notice title="Ollama nicht gefunden" body="Lokale KI gewählt, aber Ollama läuft nicht. Unter ⚙️ KI installieren oder auf Cloud-API umstellen." />}
      {status === "no-model" && <Notice title="Kein Modell" body="Ollama läuft, aber kein Modell installiert. Unter ⚙️ KI installieren (oder: ollama pull qwen2.5:7b)." />}

      {status === "ready" && (
        <>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "4px 2px", maxHeight: 420 }}>
            {messages.length === 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Wie produktiv war Dario diesen Monat?", "Zeig mir die Auslastung der Firma", "Wer hat die höchste Verrechenbarkeit?"].map((s) => (
                  <button key={s} className="chip" style={{ fontSize: 12.5 }} onClick={() => setInput(s)}>{s}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.role === "user" ? "var(--hotpink)" : "var(--input-bg)", color: m.role === "user" ? "#fff" : "var(--plum)", padding: "9px 13px", borderRadius: 14, fontWeight: 600, fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content}</div>
            ))}
            {busy && <div style={{ alignSelf: "flex-start", color: "var(--plum-soft)", fontWeight: 600, fontSize: 13 }} className="animate-pulse">denkt nach… 🤔</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Frag etwas über deine Zahlen…" disabled={busy}
              style={{ flex: 1, borderRadius: 14, border: "1.5px solid var(--chip-border)", background: "var(--input-bg)", color: "var(--plum)", fontFamily: "var(--font-body)", fontWeight: 600, padding: "11px 14px", outline: "none" }} />
            <button onClick={send} disabled={busy || !input.trim()} className="chip active" style={{ fontWeight: 800, padding: "0 18px" }}>Senden</button>
          </div>
        </>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) { return <p style={{ color: "var(--plum-soft)", fontWeight: 600, fontSize: 13 }} className="animate-pulse">{text}</p>; }
function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: "var(--input-bg)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontWeight: 800, color: "var(--plum)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--plum-soft)", lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}
