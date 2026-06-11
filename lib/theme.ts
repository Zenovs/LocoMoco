import fs from "fs";
import path from "path";

// Aktives Theme — bewusst getrennt von den MOCO-Credentials gespeichert
// (~/.loco-moco/theme), damit es auch ohne abgeschlossenes Setup gilt.
// Auflösung: Datei → ENV LOCO_THEME → "girly".
export const AVAILABLE_THEMES = ["girly", "pro", "ocean"] as const;
export type ThemeName = (typeof AVAILABLE_THEMES)[number];

const FILE = path.join(process.env.HOME ?? "/tmp", ".loco-moco", "theme");

function isTheme(t: string): t is ThemeName {
  return (AVAILABLE_THEMES as readonly string[]).includes(t);
}

export function defaultTheme(): ThemeName {
  const env = process.env.LOCO_THEME ?? "";
  return isTheme(env) ? env : "girly";
}

export function readTheme(): ThemeName {
  try {
    const t = fs.readFileSync(FILE, "utf-8").trim();
    if (isTheme(t)) return t;
  } catch {
    /* keine Datei -> Default */
  }
  return defaultTheme();
}

export function writeTheme(theme: string): boolean {
  if (!isTheme(theme)) return false;
  try {
    const dir = path.dirname(FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FILE, theme, { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}
