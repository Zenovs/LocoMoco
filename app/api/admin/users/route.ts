import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { readUsers, createUser, findByUsername, toPublic } from "@/lib/users";
import { hashPassword } from "@/lib/password";
import { findRole } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const guard = await requireCapability(req, "users.manage");
  if ("error" in guard) return guard.error;
  return NextResponse.json({ users: readUsers().map(toPublic) });
}

export async function POST(req: NextRequest) {
  const guard = await requireCapability(req, "users.manage");
  if ("error" in guard) return guard.error;

  let b: {
    username?: string;
    name?: string;
    password?: string;
    role?: string;
    theme?: string;
    mocoUserId?: number;
    active?: boolean;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const username = String(b.username ?? "").trim();
  const password = String(b.password ?? "");
  if (!username || password.length < 6) {
    return NextResponse.json({ error: "Benutzername nötig, Passwort min. 6 Zeichen." }, { status: 400 });
  }
  if (findByUsername(username)) {
    return NextResponse.json({ error: "Benutzername bereits vergeben." }, { status: 409 });
  }
  if (!b.role || !findRole(b.role)) {
    return NextResponse.json({ error: "Gültige Rolle nötig." }, { status: 400 });
  }

  const user = createUser({
    username,
    name: String(b.name ?? "").trim() || username,
    passwordHash: await hashPassword(password),
    role: b.role,
    theme: b.theme,
    mocoUserId: typeof b.mocoUserId === "number" ? b.mocoUserId : undefined,
    active: b.active !== false,
  });
  return NextResponse.json({ ok: true, user: toPublic(user) });
}
