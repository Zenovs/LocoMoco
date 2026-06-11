import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { updateRole, deleteRole } from "@/lib/roles";
import { ALL_CAPABILITIES, ALL_CARDS } from "@/lib/permissions";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const guard = await requireCapability(req, "roles.manage");
  if ("error" in guard) return guard.error;
  const { key } = await ctx.params;

  let body: { name?: string; capabilities?: string[]; cards?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const patch: { name?: string; capabilities?: string[]; cards?: string[] } = {};
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.capabilities) patch.capabilities = body.capabilities.filter((c) => ALL_CAPABILITIES.includes(c));
  if (body.cards) patch.cards = body.cards.filter((c) => ALL_CARDS.includes(c));

  const role = updateRole(key, patch);
  if (!role) return NextResponse.json({ error: "Rolle nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true, role });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const guard = await requireCapability(req, "roles.manage");
  if ("error" in guard) return guard.error;
  const { key } = await ctx.params;
  if (!deleteRole(key)) {
    return NextResponse.json({ error: "Rolle ist geschützt oder nicht vorhanden." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
