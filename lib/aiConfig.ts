// KI-Konfiguration — PRO GERÄT (im localStorage des Clients/Browsers, nicht am
// Server). Wählt, wie Loco-Chat denkt: lokales Ollama, eine Cloud-API
// (OpenAI-kompatibel) oder aus.
export type AIMode = "ollama" | "cloud" | "off";

export interface AIConfig {
  mode: AIMode;
  ollamaModel?: string; // optionaler Modell-Override fürs lokale Ollama
  cloud: {
    baseUrl: string; // OpenAI-kompatibel, z. B. https://api.openai.com/v1
    apiKey: string;
    model: string; // z. B. gpt-4o-mini
  };
}

export const DEFAULT_AI: AIConfig = {
  mode: "ollama",
  cloud: { baseUrl: "https://api.openai.com/v1", apiKey: "", model: "gpt-4o-mini" },
};

const KEY = "locoAI";

export function readAI(): AIConfig {
  if (typeof window === "undefined") return DEFAULT_AI;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AIConfig>;
      return { ...DEFAULT_AI, ...p, cloud: { ...DEFAULT_AI.cloud, ...(p.cloud ?? {}) } };
    }
  } catch { /* ignore */ }
  return DEFAULT_AI;
}

export function writeAI(c: AIConfig): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

// Ist die native App-Hülle da (für Ollama install/deinstall per Brücke)?
export function hasNativeBridge(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { webkit?: { messageHandlers?: { locomoco?: unknown } } };
  return !!w.webkit?.messageHandlers?.locomoco;
}
export function nativeAction(action: string, extra: Record<string, unknown> = {}): void {
  const w = window as unknown as { webkit?: { messageHandlers?: { locomoco?: { postMessage: (m: unknown) => void } } } };
  w.webkit?.messageHandlers?.locomoco?.postMessage({ action, ...extra });
}
