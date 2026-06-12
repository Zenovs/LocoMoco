"use client";

import { useEffect, useRef, useState } from "react";

// Lokales LLM über Ollama (läuft auf DEM Gerät, nutzt dessen Rechenpower).
// Die Seite läuft im Client (WKWebView/Browser), daher ist localhost = das Gerät.
const OLLAMA = "http://localhost:11434";
// Bevorzugte Modelle (gut im Tool-Use, laufen auf Apple Silicon).
const PREFERRED = ["qwen2.5:7b", "qwen2.5:7b-instruct", "llama3.1:8b", "qwen2.5:3b", "llama3.2:3b"];

const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

interface ChatMsg { role: "user" | "assistant" | "tool" | "system"; content: string; tool_calls?: ToolCall[]; }
interface ToolCall { function: { name: string; arguments: Record<string, unknown> }; }

// ---------------------------------------------------------------------------
// Tools: das LLM ruft diese; ausgeführt werden sie gegen die Server-Endpunkte
// (RBAC bleibt erhalten — der Server gibt 403, wenn der User kein Recht hat).
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_employees",
      description: "Listet alle aktiven Mitarbeitenden (Name + ID). Nutze das, um einen Namen aufzulösen.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_employee_productivity",
      description: "Produktivität, verrechenbare und erfasste Stunden einer Person in einem Monat.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name der Person, z. B. 'Dario'" },
          year: { type: "number" },
          month: { type: "number", description: "1-12" },
        },
        required: ["name", "year", "month"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_company_overview",
      description: "Firmenweite Kennzahlen eines Monats: Auslastung, Verrechenbarkeit, (falls verfügbar) Umsatz.",
      parameters: {
        type: "object",
        properties: { year: { type: "number" }, month: { type: "number" } },
        required: ["year", "month"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_wirtschaftlichkeit",
      description: "Kosten, erwirtschafteter Umsatz und Deckungsbeitrag pro Mitarbeiter (nur mit Lohn-Leserecht).",
      parameters: {
        type: "object",
        properties: { year: { type: "number" }, month: { type: "number" } },
        required: ["year", "month"],
      },
    },
  },
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
    if (name === "list_employees") {
      return await loadEmployees();
    }
    if (name === "get_employee_productivity") {
      const emps = await loadEmployees();
      const u = matchEmployee(emps, String(args.name ?? ""));
      if (!u) return { error: `Mitarbeiter '${args.name}' nicht gefunden.` };
      const d = await fetch(`/api/month?userId=${u.id}&year=${args.year}&month=${args.month}`).then((r) => r.json());
      if (d.error) return { error: d.error };
      const p = d.productivity ?? {};
      return {
        employee: u.name, year: args.year, month: args.month,
        productivityPct: p.productivityPct, billableHours: p.billableHours, recordedHours: p.totalHours,
        internalHours: p.internalHours, targetPct: p.targetPct ?? p.pensumPct,
      };
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
    return { error: `Unbekanntes Tool: ${name}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Tool-Fehler" };
  }
}

// ---------------------------------------------------------------------------
export default function LocoChat({ defaultYear, defaultMonth }: { defaultYear: number; defaultMonth: number }) {
  const [status, setStatus] = useState<"checking" | "ready" | "no-ollama" | "no-model">("checking");
  const [model, setModel] = useState<string>("");
  const [models, setModels] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${OLLAMA}/api/tags`)
      .then((r) => r.json())
      .then((d: { models?: { name: string }[] }) => {
        const names = (d.models ?? []).map((m) => m.name);
        setModels(names);
        if (names.length === 0) { setStatus("no-model"); return; }
        const pick = PREFERRED.find((p) => names.includes(p)) ?? names[0];
        setModel(pick); setStatus("ready");
      })
      .catch(() => setStatus("no-ollama"));
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const systemPrompt = `Du bist Loco-Chat, ein Assistent im Zeiterfassungs-Tool Loco Moco. Beantworte Fragen zu Mitarbeitenden, Produktivität, Auslastung und (falls erlaubt) Wirtschaftlichkeit. Nutze IMMER die bereitgestellten Tools, um echte Zahlen zu holen — erfinde nie Werte. Wenn ein Monat/Jahr fehlt, nimm an: Monat ${defaultMonth} (${MONTHS_DE[defaultMonth - 1]}), Jahr ${defaultYear}. Antworte knapp auf Deutsch, mit den konkreten Zahlen. Bekommt ein Tool "error: Keine Berechtigung", sag der Person freundlich, dass ihr dafür die Freigabe fehlt.`;

  async function send() {
    const q = input.trim();
    if (!q || busy || status !== "ready") return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);

    // interner Verlauf inkl. system + tool-Nachrichten
    const convo: ChatMsg[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: q },
    ];

    try {
      for (let step = 0; step < 6; step++) {
        const res = await fetch(`${OLLAMA}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: convo, tools: TOOLS, stream: false }),
        });
        if (!res.ok) throw new Error(`Ollama ${res.status}`);
        const data = (await res.json()) as { message: ChatMsg };
        const msg = data.message;
        convo.push(msg);

        if (msg.tool_calls && msg.tool_calls.length > 0) {
          for (const tc of msg.tool_calls) {
            const result = await executeTool(tc.function.name, tc.function.arguments ?? {});
            convo.push({ role: "tool", content: JSON.stringify(result) });
          }
          continue; // erneut ans LLM, jetzt mit den Tool-Ergebnissen
        }
        // keine Tool-Calls -> finale Antwort
        setMessages((m) => [...m, { role: "assistant", content: msg.content || "(keine Antwort)" }]);
        break;
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ Fehler: ${e instanceof Error ? e.message : "unbekannt"}. Läuft Ollama? (OLLAMA_ORIGINS muss diese Seite erlauben.)` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 360 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 17, color: "var(--plum)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🤖</span> Loco-Chat <span style={{ fontSize: 11, fontWeight: 700, color: "var(--plum-soft)" }}>· lokale KI{model ? ` (${model})` : ""}</span>
        </h3>
        <p style={{ fontSize: 12, color: "var(--plum-soft)", fontWeight: 600, margin: "4px 0 0" }}>
          Frag z. B. „Wie produktiv war Dario im Juni?" — läuft komplett auf deinem Gerät, keine Cloud.
        </p>
      </div>

      {status === "checking" && <Empty text="Suche lokales Ollama…" />}
      {status === "no-ollama" && (
        <Notice title="Ollama nicht gefunden" body="Loco-Chat braucht das lokale LLM-Programm Ollama. Es wird mit dem Client mitinstalliert — oder manuell von ollama.com. Danach läuft der Chat ohne Cloud." />
      )}
      {status === "no-model" && (
        <Notice title="Kein Modell installiert" body="Ollama läuft, aber es ist kein Modell da. Im Terminal: ollama pull qwen2.5:7b" />
      )}

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
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.role === "user" ? "var(--hotpink)" : "var(--input-bg)", color: m.role === "user" ? "#fff" : "var(--plum)", padding: "9px 13px", borderRadius: 14, fontWeight: 600, fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {m.content}
              </div>
            ))}
            {busy && <div style={{ alignSelf: "flex-start", color: "var(--plum-soft)", fontWeight: 600, fontSize: 13 }} className="animate-pulse">denkt nach… 🤔</div>}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Frag etwas über deine Zahlen…"
              disabled={busy}
              style={{ flex: 1, borderRadius: 14, border: "1.5px solid var(--chip-border)", background: "var(--input-bg)", color: "var(--plum)", fontFamily: "var(--font-body)", fontWeight: 600, padding: "11px 14px", outline: "none" }}
            />
            <button onClick={send} disabled={busy || !input.trim()} className="chip active" style={{ fontWeight: 800, padding: "0 18px" }}>Senden</button>
          </div>
        </>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ color: "var(--plum-soft)", fontWeight: 600, fontSize: 13 }} className="animate-pulse">{text}</p>;
}
function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: "var(--input-bg)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontWeight: 800, color: "var(--plum)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--plum-soft)", lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}
