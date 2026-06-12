import fs from "fs";
import path from "path";

// Liquidität — SENSIBEL. Monatswerte (Kontostand/Einnahmen/Ausgaben), manuell
// erfasst, als Ganzes freigebbar. Nur auf dem Server, Datei mit Rechten 600.
const DIR = path.join(process.env.HOME ?? "/tmp", ".loco-moco");
const FILE = path.join(DIR, "liquidity.json");

export interface LiquidityMonth {
  balance: number; // Kontostand am Monatsende
  income: number; // Einnahmen
  expense: number; // Ausgaben
  note?: string;
}

export interface Liquidity {
  released: boolean;
  months: Record<string, LiquidityMonth>; // "YYYY-MM" -> Werte
}

export function readLiquidity(): Liquidity {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Partial<Liquidity>;
    return {
      released: !!parsed.released,
      months: parsed.months && typeof parsed.months === "object" ? parsed.months : {},
    };
  } catch {
    return { released: false, months: {} };
  }
}

function persist(l: Liquidity): Liquidity {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(l, null, 2), { mode: 0o600 });
  } catch {
    /* nicht kritisch */
  }
  return l;
}

export function writeLiquidityMonth(month: string, patch: Partial<LiquidityMonth> | null): Liquidity {
  const l = readLiquidity();
  if (patch === null) {
    delete l.months[month];
  } else {
    const cur = l.months[month] ?? { balance: 0, income: 0, expense: 0 };
    l.months[month] = {
      balance: patch.balance != null ? Number(patch.balance) : cur.balance,
      income: patch.income != null ? Number(patch.income) : cur.income,
      expense: patch.expense != null ? Number(patch.expense) : cur.expense,
      note: patch.note != null ? String(patch.note) : cur.note,
    };
  }
  return persist(l);
}

export function setLiquidityReleased(released: boolean): Liquidity {
  const l = readLiquidity();
  l.released = !!released;
  return persist(l);
}
