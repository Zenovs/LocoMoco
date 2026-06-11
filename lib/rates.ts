import fs from "fs";
import path from "path";

// Personalkostensätze (CHF pro Stunde) für die Margen-/DB-Berechnung. Lokal in
// ~/.loco-moco/rates.json, getrennt von Zugangsdaten. `default` gilt für alle,
// `perUser` überschreibt pro MOCO-Person. So kann die Administration die aus
// MOCO geschätzten Sätze jederzeit korrigieren.
const DIR = path.join(process.env.HOME ?? "/tmp", ".loco-moco");
const FILE = path.join(DIR, "rates.json");

export interface Rates {
  default: number; // CHF/h, 0 = nicht gesetzt
  perUser: Record<string, number>; // mocoUserId -> CHF/h
}

export function readRates(): Rates {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Partial<Rates>;
    return {
      default: Number.isFinite(parsed.default) ? Number(parsed.default) : 0,
      perUser: parsed.perUser && typeof parsed.perUser === "object" ? parsed.perUser : {},
    };
  } catch {
    return { default: 0, perUser: {} };
  }
}

function persist(rates: Rates): Rates {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(rates, null, 2), { mode: 0o600 });
  } catch {
    /* Schreibfehler ignorieren — Sätze sind nicht kritisch */
  }
  return rates;
}

export function writeDefaultRate(value: number | null): Rates {
  const rates = readRates();
  rates.default = value == null || !Number.isFinite(value) || value < 0 ? 0 : Math.round(value);
  return persist(rates);
}

export function writeUserRate(userId: number, value: number | null): Rates {
  const rates = readRates();
  if (value == null || !Number.isFinite(value) || value <= 0) {
    delete rates.perUser[String(userId)];
  } else {
    rates.perUser[String(userId)] = Math.round(value);
  }
  return persist(rates);
}

// Effektiver Satz für eine Person (perUser → default → 0).
export function rateFor(rates: Rates, userId: number): number {
  return rates.perUser[String(userId)] ?? rates.default ?? 0;
}

export function hasAnyRate(rates: Rates): boolean {
  return rates.default > 0 || Object.keys(rates.perUser).length > 0;
}
