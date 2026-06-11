import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./session";
import { findById, type User } from "./users";
import { findRole } from "./roles";

// Node-Runtime-Helfer (API-Routen). Holt den angemeldeten User aus dem Cookie
// und prüft Rollen-Freigaben.
export async function currentUser(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return null;
  return findById(session.sub) ?? null;
}

export function userCapabilities(user: User): string[] {
  return findRole(user.role)?.capabilities ?? [];
}

export function userCards(user: User): string[] {
  return findRole(user.role)?.cards ?? [];
}

export function hasCapability(user: User, cap: string): boolean {
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
