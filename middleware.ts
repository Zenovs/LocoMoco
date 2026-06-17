import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, authEnabled } from "@/lib/session";

// Frei zugängliche Pfade (Login-Flow + statische Assets + Hinweis-Seite)
const PUBLIC = [
  "/login",
  "/nur-app", // Hinweis, wenn der Browser gesperrt ist
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/setup",
  "/api/auth/needs-setup",
  "/api/auth/me", // liefert ohne Session sauber {user:null}
  "/api/theme", // Geräte-/Default-Theme (nicht sensibel)
];

export async function middleware(req: NextRequest) {
  // Solange Auth nicht scharf geschaltet ist, verhält sich die App wie bisher.
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

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

  // Geräte-Sperre: Ist LOCO_CLIENT_KEY gesetzt, darf die App (die den Schlüssel
  // im User-Agent mitschickt) immer rein — ein normaler Browser nur, wenn der
  // angemeldete Nutzer Admin ist. So ist die Software ausschliesslich über die
  // installierte App nutzbar (Ausnahme: Admin auch im Browser).
  const clientKey = process.env.LOCO_CLIENT_KEY || "";
  if (clientKey) {
    const ua = req.headers.get("user-agent") ?? "";
    const isApp = ua.includes(`LocoClient/${clientKey}`);
    if (!isApp && session.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Nur über die installierte Loco-Moco-App nutzbar." },
          { status: 403 }
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/nur-app";
      url.search = "";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // alles außer Next-internen Assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
