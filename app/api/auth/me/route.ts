import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, authEnabled } from "@/lib/session";
import { findById, toPublic } from "@/lib/users";

// Aktuell angemeldeter Benutzer (für die UI: Name, Rolle, Logout-Button).
export async function GET(req: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ authEnabled: false, user: null });
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ authEnabled: true, user: null });
  const user = findById(session.sub);
  return NextResponse.json({ authEnabled: true, user: user ? toPublic(user) : null });
}
