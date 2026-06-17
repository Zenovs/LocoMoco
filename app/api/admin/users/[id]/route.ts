import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { updateUser, deleteUser, findById, toPublic } from "@/lib/users";
import { hashPassword } from "@/lib/password";
import { findRole } from "@/lib/roles";
import { ALL_CARDS } from "@/lib/permissions";

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
    allowedCards?: string[] | null;
    salaryAccess?: "none" | "view" | "edit" | null;
    liquidityAccess?: "none" | "view" | "edit" | null;
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
  if ("allowedCards" in b) {
    // null = wieder „Default" (Admin sieht alles, andere nichts); Array = individuell
    patch.allowedCards = b.allowedCards == null ? undefined : b.allowedCards.filter((c) => ALL_CARDS.includes(c));
  }
  const LEVELS = ["none", "view", "edit"];
  if ("salaryAccess" in b) {
    // null = zurück auf Rollen-Vorgabe; sonst die gewählte Stufe
    patch.salaryAccess = b.salaryAccess != null && LEVELS.includes(b.salaryAccess) ? b.salaryAccess : undefined;
  }
  if ("liquidityAccess" in b) {
    patch.liquidityAccess = b.liquidityAccess != null && LEVELS.includes(b.liquidityAccess) ? b.liquidityAccess : undefined;
  }
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
