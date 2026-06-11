import { NextRequest, NextResponse } from "next/server";
import { readTargets, writeTarget } from "@/lib/targets";

export async function GET() {
  return NextResponse.json({ targets: readTargets() });
}

export async function POST(req: NextRequest) {
  let body: { userId?: number; target?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }
  const userId = Number(body.userId);
  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }
  const target = body.target == null ? null : Number(body.target);
  const targets = writeTarget(userId, target);
  return NextResponse.json({ ok: true, targets });
}
