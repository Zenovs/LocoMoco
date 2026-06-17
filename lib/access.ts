import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, authEnabled } from "./session";
import { findById, type User, type AccessLevel } from "./users";
import { findRole } from "./roles";
import { ALL_CAPABILITIES, ALL_CARDS } from "./permissions";

// Eine Zugriffsstufe (none/view/edit) auf die zugehörigen Capabilities abbilden.
function levelCaps(level: AccessLevel, viewCap: string, editCap: string): string[] {
  if (level === "edit") return [viewCap, editCap];
  if (level === "view") return [viewCap];
  return [];
}

// Node-Runtime-Helfer (API-Routen). Holt den angemeldeten User aus dem Cookie
// und prüft Rollen-Freigaben.
export async function currentUser(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return null;
  return findById(session.sub) ?? null;
}

export function userCapabilities(user: User): string[] {
  const role = findRole(user.role);
  // Der geschützte Admin hat IMMER alle Freigaben (auch neu hinzugekommene).
  if (role?.builtin) return [...ALL_CAPABILITIES];

  const caps = new Set(role?.capabilities ?? []);
  // Pro-Person-Überschreibung: ist eine Stufe gesetzt, ersetzt sie die
  // Rollen-Vorgabe für die jeweiligen Lohn-/Liquiditäts-Rechte.
  if (user.salaryAccess != null) {
    caps.delete("data.salary");
    caps.delete("salary.manage");
    for (const c of levelCaps(user.salaryAccess, "data.salary", "salary.manage")) caps.add(c);
  }
  if (user.liquidityAccess != null) {
    caps.delete("data.liquidity");
    caps.delete("liquidity.manage");
    for (const c of levelCaps(user.liquidityAccess, "data.liquidity", "liquidity.manage")) caps.add(c);
  }
  return [...caps];
}

export function userCards(user: User): string[] {
  // Funktionen/Karten werden PRO PERSON freigeschaltet. Default: nichts.
  // Ausnahme: der geschützte Admin sieht standardmäßig alles.
  if (user.allowedCards != null) return user.allowedCards;
  return findRole(user.role)?.builtin ? [...ALL_CARDS] : [];
}

export function hasCapability(user: User, cap: string): boolean {
  if (findRole(user.role)?.builtin) return true; // Admin: alles
  return userCapabilities(user).includes(cap);
}

// Bequemer Guard für Admin-Routen: liefert den User oder eine fertige
// 401/403-Response.
export async function requireCapability(
  req: NextRequest,
  cap: string
): Promise<{ user: User } | { error: NextResponse }> {
  const user = await currentUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  }
  if (!hasCapability(user, cap)) {
    return { error: NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 }) };
  }
  return { user };
}

// Datenscoping: wer "data.all" hat, darf die angefragte Person sehen; sonst nur
// die eigene verknüpfte MOCO-Person. Bei deaktiviertem Auth keine Einschränkung.
export async function scopedUserId(
  req: NextRequest,
  requested: number
): Promise<{ userId: number } | { error: NextResponse }> {
  if (!authEnabled()) return { userId: requested };
  const user = await currentUser(req);
  if (!user) return { error: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  if (hasCapability(user, "data.all")) return { userId: requested };
  if (!user.mocoUserId) {
    return {
      error: NextResponse.json(
        { error: "Dir ist keine MOCO-Person zugewiesen. Bitte an die Administration wenden." },
        { status: 403 }
      ),
    };
  }
  return { userId: user.mocoUserId };
}

// Verlangt die Freigabe "alle sehen" (für firmenweite Sichten wie Schläferprojekte).
export async function requireDataAll(
  req: NextRequest
): Promise<{ ok: true } | { error: NextResponse }> {
  if (!authEnabled()) return { ok: true };
  const user = await currentUser(req);
  if (!user) return { error: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  if (!hasCapability(user, "data.all")) {
    return { error: NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 }) };
  }
  return { ok: true };
}

