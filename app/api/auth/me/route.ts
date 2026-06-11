import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, authEnabled } from "@/lib/session";
import { findById, toPublic } from "@/lib/users";
import { userCapabilities, userCards } from "@/lib/access";

// Aktuell angemeldeter Benutzer inkl. aufgelöster Freigaben/Karten — die UI
// blendet danach Karten/Bereiche ein oder aus.
export async function GET(req: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ authEnabled: false, user: null, capabilities: [], cards: [] });
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ authEnabled: true, user: null, capabilities: [], cards: [] });
  const user = findById(session.sub);
  if (!user) return NextResponse.json({ authEnabled: true, user: null, capabilities: [], cards: [] });
  return NextResponse.json({
    authEnabled: true,
    user: toPublic(user),
    capabilities: userCapabilities(user),
    cards: userCards(user),
  });
}
