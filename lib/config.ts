import fs from "fs";
import path from "path";
import type { MocoConfig } from "@/types/moco";

const CONFIG_DIR = path.join(process.env.HOME ?? "/tmp", ".loco-moco");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export function readConfig(): MocoConfig | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<MocoConfig>;
    if (parsed.subdomain && parsed.apiKey) {
      return { subdomain: parsed.subdomain, apiKey: parsed.apiKey };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeConfig(config: MocoConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), {
    mode: 0o600,
    encoding: "utf-8",
  });
}
