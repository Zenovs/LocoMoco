import fs from "fs";
import path from "path";

// Löhne / Personalkosten pro MOCO-Person — SENSIBEL. Nur auf dem Server,
// Datei mit Rechten 600, getrennt von allem anderen. Nie ins Git.
// Kosten = Bruttolohn × Faktor (Vollkosten/Monat). sellRate = Verkaufssatz
// (CHF/h) für den "produzierten" Umsatz. released = von der HR freigegeben.
const DIR = path.join(process.env.HOME ?? "/tmp", ".loco-moco");
const FILE = path.join(DIR, "salaries.json");

export interface SalaryEntry {
  grossMonthly: number; // Bruttolohn / Monat
  factor: number; // Kostenfaktor (Overhead/Sozialabgaben), z. B. 1.2
  sellRate: number; // Verkaufsstundensatz CHF/h
  released: boolean; // freigegeben (für Berechtigte sichtbar)
  updatedAt: string;
}

export type Salaries = Record<string, SalaryEntry>; // mocoUserId -> Eintrag

export function vollkosten(e: SalaryEntry): number {
  return Math.round((e.grossMonthly || 0) * (e.factor || 1));
}

export function readSalaries(): Salaries {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Salaries;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persist(s: Salaries): Salaries {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(s, null, 2), { mode: 0o600 });
  } catch {
    /* nicht kritisch */
  }
  return s;
}

export function writeSalary(userId: number, patch: Partial<SalaryEntry>): Salaries {
  const s = readSalaries();
  const key = String(userId);
  const cur: SalaryEntry = s[key] ?? { grossMonthly: 0, factor: 1.2, sellRate: 0, released: false, updatedAt: "" };
  const next: SalaryEntry = {
    grossMonthly: patch.grossMonthly != null ? Math.max(0, Number(patch.grossMonthly)) : cur.grossMonthly,
    factor: patch.factor != null ? Math.max(1, Number(patch.factor)) : cur.factor,
    sellRate: patch.sellRate != null ? Math.max(0, Number(patch.sellRate)) : cur.sellRate,
    released: patch.released != null ? !!patch.released : cur.released,
    updatedAt: new Date().toISOString(),
  };
  s[key] = next;
  return persist(s);
}

export function deleteSalary(userId: number): Salaries {
  const s = readSalaries();
  delete s[String(userId)];
  return persist(s);
}

// Nur die freigegebenen Einträge (für die Lese-/Wirtschaftlichkeits-Sicht).
export function readReleasedSalaries(): Salaries {
  const s = readSalaries();
  const out: Salaries = {};
  for (const [k, v] of Object.entries(s)) if (v.released) out[k] = v;
  return out;
}
