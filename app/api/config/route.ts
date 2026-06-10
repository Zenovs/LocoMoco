import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/config";
import { testConnection } from "@/lib/moco/client";
import type { MocoConfig } from "@/types/moco";

/**
 * Akzeptiert eine volle MOCO-URL ("https://schnyder.mocoapp.com") ODER nur die
 * Subdomain ("schnyder") und extrahiert in beiden Fällen die reine Subdomain.
 */
function parseSubdomain(input: string): string {
  let s = input.trim().replace(/^https?:\/\//i, "");
  s = s.split("/")[0]; // Pfad abschneiden
  const m = s.match(/^([^.]+)\.mocoapp\.com$/i);
  if (m) return m[1].toLowerCase();
  return s.replace(/\.mocoapp\.com.*$/i, "").toLowerCase();
}

export async function GET() {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }
  return NextResponse.json({
    configured: true,
    subdomain: config.subdomain,
    username: config.username ?? "",
  });
}

export async function POST(req: NextRequest) {
  let body: { url?: string; subdomain?: string; apiKey?: string; username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  const existing = readConfig();

  const rawDomain = (body.url ?? body.subdomain ?? "").trim();
  const subdomain = rawDomain ? parseSubdomain(rawDomain) : existing?.subdomain ?? "";

  // API-Key leer lassen heißt "bestehenden behalten" (beim Re-Konfigurieren)
  const apiKey = body.apiKey?.trim() || existing?.apiKey || "";

  const username = (body.username ?? existing?.username ?? "").trim();

  if (!subdomain) {
    return NextResponse.json(
      { error: "Bitte die MOCO-URL oder Subdomain angeben (z. B. schnyder.mocoapp.com)." },
      { status: 400 }
    );
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: "Bitte den API-Key angeben (MOCO → Profil → Integrations)." },
      { status: 400 }
    );
  }

  const config: MocoConfig = {
    subdomain,
    apiKey,
    username: username || undefined,
  };

  try {
    await testConnection(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  writeConfig(config);
  return NextResponse.json({ ok: true, subdomain: config.subdomain, username: config.username ?? "" });
}
