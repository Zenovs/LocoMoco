import { NextRequest, NextResponse } from "next/server";
import { findByUsername } from "@/lib/users";
import { verifyPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE, cookieMaxAge } from "@/lib/session";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const user = findByUsername(String(body.username ?? ""));
  const ok =
    user &&
    user.active &&
    (await verifyPassword(String(body.password ?? ""), user.passwordHash));

  if (!user || !ok) {
    return NextResponse.json({ error: "Benutzername oder Passwort falsch." }, { status: 401 });
  }

  const token = await signSession({
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge(),
    secure: process.env.LOCO_HTTPS === "1",
  });
  return res;
}
