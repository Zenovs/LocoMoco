import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/config";
import { testConnection } from "@/lib/moco/client";
import type { MocoConfig } from "@/types/moco";

export async function GET() {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }
  return NextResponse.json({ configured: true, subdomain: config.subdomain });
}

export async function POST(req: NextRequest) {
  let body: Partial<MocoConfig>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  const { subdomain, apiKey } = body;
  if (!subdomain || !apiKey) {
    return NextResponse.json(
      { error: "Subdomain und API-Key sind beide Pflichtfelder." },
      { status: 400 }
    );
  }

  const config: MocoConfig = { subdomain: subdomain.trim(), apiKey: apiKey.trim() };

  try {
    await testConnection(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  writeConfig(config);
  return NextResponse.json({ ok: true, subdomain: config.subdomain });
}
