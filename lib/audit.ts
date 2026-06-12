import fs from "fs";
import path from "path";

// Revisionssicheres (Append-only) Protokoll für sensible Zugriffe: wer hat
// wann Löhne/Liquidität gesehen oder geändert. JSON-Lines, Rechte 600.
const DIR = path.join(process.env.HOME ?? "/tmp", ".loco-moco");
const FILE = path.join(DIR, "audit.log");

export interface AuditEntry {
  ts: string;
  user: string;
  role?: string;
  action: string; // z. B. "salary.view", "salary.change", "liquidity.view"
  detail?: string;
}

export function audit(user: string, role: string | undefined, action: string, detail?: string): void {
  const entry: AuditEntry = { ts: new Date().toISOString(), user, role, action, detail };
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.appendFileSync(FILE, JSON.stringify(entry) + "\n", { mode: 0o600 });
  } catch {
    /* Protokollfehler dürfen die Funktion nicht blockieren */
  }
}

export function readAudit(limit = 300): AuditEntry[] {
  try {
    const lines = fs.readFileSync(FILE, "utf-8").trim().split("\n");
    return lines
      .slice(-limit)
      .map((l) => { try { return JSON.parse(l) as AuditEntry; } catch { return null; } })
      .filter((e): e is AuditEntry => e !== null)
      .reverse();
  } catch {
    return [];
  }
}
