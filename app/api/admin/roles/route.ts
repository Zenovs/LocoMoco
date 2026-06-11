import { NextRequest, NextResponse } from "next/server";
import { currentUser, hasCapability, requireCapability } from "@/lib/access";
import { readRoles, createRole } from "@/lib/roles";
import { CAPABILITIES, CARDS, ALL_CAPABILITIES, ALL_CARDS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!hasCapability(user, "users.manage") && !hasCapability(user, "roles.manage")) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  return NextResponse.json({ roles: readRoles(), capabilities: CAPABILITIES, cards: CARDS });
}

export async function POST(req: NextRequest) {
  const guard = await requireCapability(req, "roles.manage");
  if ("error" in guard) return guard.error;

  let body: { name?: string; capabilities?: string[]; cards?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name nötig." }, { status: 400 });

  const caps = (body.capabilities ?? []).filter((c) => ALL_CAPABILITIES.includes(c));
  const cards = (body.cards ?? []).filter((c) => ALL_CARDS.includes(c));
  const role = createRole(name, caps, cards);
  return NextResponse.json({ ok: true, role });
}
