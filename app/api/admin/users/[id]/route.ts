import { NextRequest, NextResponse } from "next/server";
import { currentUser, requireCapability } from "@/lib/access";
import { updateUser, deleteUser, findById, toPublic } from "@/lib/users";
import { hashPassword } from "@/lib/password";
import { findRole } from "@/lib/roles";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(req, "users.manage");
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  if (!findById(id)) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  let b: {
    name?: string;
    role?: string;
    theme?: string;
    mocoUserId?: number | null;
    active?: boolean;
    password?: string;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (b.name != null) patch.name = String(b.name).trim();
  if (b.role != null) {
    if (!findRole(b.role)) return NextResponse.json({ error: "Unbekannte Rolle." }, { status: 400 });
    patch.role = b.role;
  }
  if (b.theme != null) patch.theme = b.theme;
  if (b.mocoUserId !== undefined) patch.mocoUserId = b.mocoUserId === null ? undefined : Number(b.mocoUserId);
  if (b.active != null) patch.active = !!b.active;
  if (b.password) {
    if (b.password.length < 6) return NextResponse.json({ error: "Passwort min. 6 Zeichen." }, { status: 400 });
    patch.passwordHash = await hashPassword(b.password);
  }

  const user = updateUser(id, patch);
  return NextResponse.json({ ok: true, user: user ? toPublic(user) : null });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(req, "users.manage");
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;

  const me = guard.user;
  if (me.id === id) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst löschen." }, { status: 400 });
  }
  deleteUser(id);
  return NextResponse.json({ ok: true });
}
