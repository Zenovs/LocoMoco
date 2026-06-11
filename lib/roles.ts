import fs from "fs";
import path from "path";
import { ALL_CAPABILITIES, ALL_CARDS } from "./permissions";

// Rollen als JSON unter ~/.loco-moco/roles.json. Start-Rollen werden beim ersten
// Zugriff angelegt und sind danach im Admin-Panel frei editierbar/erweiterbar.
const DIR = path.join(process.env.HOME ?? "/tmp", ".loco-moco");
const FILE = path.join(DIR, "roles.json");

export interface Role {
  key: string; // eindeutig, z. B. "admin"
  name: string; // Anzeigename
  builtin?: boolean; // admin ist geschützt (nicht löschbar, behält alle Rechte)
  capabilities: string[];
  cards: string[];
}

const DEFAULT_ROLES: Role[] = [
  {
    key: "admin",
    name: "Admin",
    builtin: true,
    capabilities: [...ALL_CAPABILITIES],
    cards: [...ALL_CARDS],
  },
  {
    key: "geschaeftsleitung",
    name: "Geschäftsleitung",
    capabilities: ["data.all", "data.salary", "data.liquidity"],
    cards: [...ALL_CARDS],
  },
  {
    key: "hr",
    name: "HR",
    capabilities: ["data.all", "data.salary"],
    cards: ["productivity", "hoursCheck", "nonBillable", "sleeping"],
  },
];

function write(roles: Role[]): void {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(roles, null, 2), { mode: 0o600 });
}

export function readRoles(): Role[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Role[];
  } catch {
    /* fällt auf Defaults zurück */
  }
  write(DEFAULT_ROLES);
  return DEFAULT_ROLES;
}

export function findRole(key: string): Role | undefined {
  return readRoles().find((r) => r.key === key);
}

function slug(s: string): string {
  // NFD trennt Umlaute in Buchstabe + Kombinationszeichen; [^a-z0-9] entfernt
  // die Kombinationszeichen dann mit.
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createRole(name: string, capabilities: string[], cards: string[]): Role {
  const roles = readRoles();
  let key = slug(name) || `rolle-${roles.length + 1}`;
  while (roles.some((r) => r.key === key)) key = `${key}-2`;
  const role: Role = { key, name: name.trim(), capabilities, cards };
  roles.push(role);
  write(roles);
  return role;
}

export function updateRole(key: string, patch: Partial<Omit<Role, "key" | "builtin">>): Role | undefined {
  const roles = readRoles();
  const i = roles.findIndex((r) => r.key === key);
  if (i < 0) return undefined;
  // admin behält immer alle Rechte
  if (roles[i].builtin) {
    roles[i] = { ...roles[i], name: patch.name ?? roles[i].name };
  } else {
    roles[i] = { ...roles[i], ...patch };
  }
  write(roles);
  return roles[i];
}

export function deleteRole(key: string): boolean {
  const roles = readRoles();
  const role = roles.find((r) => r.key === key);
  if (!role || role.builtin) return false;
  write(roles.filter((r) => r.key !== key));
  return true;
}
