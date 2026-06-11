import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";
import { readRates, writeDefaultRate, writeUserRate } from "@/lib/rates";
import { cacheClearAll } from "@/lib/moco/cache";

// Personalkostensätze (für Margen/DB). Wie die MOCO-Verbindung nur mit
// config.manage zugänglich — normale User dürfen das nicht.
async function guard(req: NextRequest) {
  if (!authEnabled()) return null;
  const g = await requireCapability(req, "config.manage");
  return "error" in g ? g.error : null;
}

export async function GET(req: NextRequest) {
  const err = await guard(req);
  if (err) return err;
  return NextResponse.json({ rates: readRates() });
}

export async function POST(req: NextRequest) {
  const err = await guard(req);
  if (err) return err;

  let body: { default?: number | null; userId?: number; rate?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  let rates;
  if (body.userId != null) {
    rates = writeUserRate(Number(body.userId), body.rate == null ? null : Number(body.rate));
  } else {
    rates = writeDefaultRate(body.default == null ? null : Number(body.default));
  }
  // Margen hängen an den Sätzen — Firmen-Cache leeren, damit sie neu rechnen.
  cacheClearAll();
  return NextResponse.json({ ok: true, rates });
}
