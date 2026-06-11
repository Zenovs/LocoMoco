import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, authEnabled } from "@/lib/session";

// Frei zugängliche Pfade (Login-Flow + statische Assets)
const PUBLIC = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/setup",
  "/api/auth/needs-setup",
];

export async function middleware(req: NextRequest) {
  // Solange Auth nicht scharf geschaltet ist, verhält sich die App wie bisher.
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // alles außer Next-internen Assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
