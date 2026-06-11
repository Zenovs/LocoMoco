import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Benutzer-/Rollen-Speicher als JSON unter ~/.loco-moco/users.json — konsistent
// mit dem übrigen App-Datenmodell (config.json, targets.json, theme). Übersteht
// Auto-Deploys (liegt außerhalb des Repos).
const DIR = path.join(process.env.HOME ?? "/tmp", ".loco-moco");
const FILE = path.join(DIR, "users.json");

export interface User {
  id: string;
  username: string; // Login (eindeutig)
  name: string; // Anzeigename
  passwordHash: string;
  role: string; // Rollen-Schlüssel (siehe lib/roles.ts)
  theme?: string; // pro Person zugewiesenes Theme
  allowedCards?: string[]; // sichtbare Dashboard-Karten (leer/undefined = Standard)
  mocoUserId?: number; // Verknüpfung zur MOCO-Person (für "eigene Daten")
  active: boolean;
  createdAt: string;
}

export type PublicUser = Omit<User, "passwordHash">;

export function toPublic(u: User): PublicUser {
  const { passwordHash, ...rest } = u; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

export function readUsers(): User[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    return Array.isArray(parsed) ? (parsed as User[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2), { mode: 0o600 });
}

export function userCount(): number {
  return readUsers().length;
}

export function findByUsername(username: string): User | undefined {
  const u = username.trim().toLowerCase();
  return readUsers().find((x) => x.username.toLowerCase() === u);
}

export function findById(id: string): User | undefined {
  return readUsers().find((x) => x.id === id);
}

export function createUser(data: Omit<User, "id" | "createdAt">): User {
  const users = readUsers();
  const user: User = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
  users.push(user);
  writeUsers(users);
  return user;
}

export function updateUser(id: string, patch: Partial<Omit<User, "id" | "createdAt">>): User | undefined {
  const users = readUsers();
  const i = users.findIndex((u) => u.id === id);
  if (i < 0) return undefined;
  users[i] = { ...users[i], ...patch };
  writeUsers(users);
  return users[i];
}

export function deleteUser(id: string): void {
  writeUsers(readUsers().filter((u) => u.id !== id));
}
