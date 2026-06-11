import fs from "fs";
import path from "path";

// Pro Mitarbeiter ein Mindestziel für die Produktivität (in %), lokal gespeichert
// in ~/.loco-moco/targets.json. Getrennt von den Zugangsdaten (config.json).
const DIR = path.join(process.env.HOME ?? "/tmp", ".loco-moco");
const FILE = path.join(DIR, "targets.json");

export type Targets = Record<string, number>; // userId -> Mindest-%

export function readTargets(): Targets {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Targets;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeTarget(userId: number, target: number | null): Targets {
  const targets = readTargets();
  if (target === null || !Number.isFinite(target) || target <= 0) {
    delete targets[String(userId)];
  } else {
    targets[String(userId)] = Math.min(100, Math.round(target));
  }
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(targets, null, 2), { mode: 0o600 });
  } catch {
    /* Schreibfehler ignorieren — Ziele sind nicht kritisch */
  }
  return targets;
}
