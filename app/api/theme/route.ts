import { NextRequest, NextResponse } from "next/server";
import { readTheme, writeTheme, AVAILABLE_THEMES } from "@/lib/theme";

export async function GET() {
  return NextResponse.json({ theme: readTheme(), available: AVAILABLE_THEMES });
}

export async function POST(req: NextRequest) {
  let body: { theme?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }
  if (!writeTheme(String(body.theme ?? ""))) {
    return NextResponse.json({ error: "Unbekanntes Theme." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, theme: body.theme });
}
