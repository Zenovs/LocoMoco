import { NextRequest, NextResponse } from "next/server";
import { userCount, createUser } from "@/lib/users";
import { hashPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE, cookieMaxAge } from "@/lib/session";

// Legt den ERSTEN Admin an (nur möglich, solange es noch keinen User gibt).
export async function POST(req: NextRequest) {
  if (userCount() > 0) {
    return NextResponse.json({ error: "Bereits eingerichtet." }, { status: 400 });
  }
  let body: { username?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username || password.length < 6) {
    return NextResponse.json(
      { error: "Benutzername nötig, Passwort mindestens 6 Zeichen." },
      { status: 400 }
    );
  }

  const user = createUser({
    username,
    name: String(body.name ?? "").trim() || username,
    passwordHash: await hashPassword(password),
    role: "admin",
    active: true,
  });

  const token = await signSession({
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge(),
    secure: process.env.LOCO_HTTPS === "1",
  });
  return res;
}
