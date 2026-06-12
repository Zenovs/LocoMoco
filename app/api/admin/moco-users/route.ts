import { NextRequest, NextResponse } from "next/server";
import { currentUser, hasCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";
import { readConfig } from "@/lib/config";
import { getUsers } from "@/lib/moco/client";

// Liste der MOCO-Personen (id + Name) — zum Verknüpfen eines LocoMoco-Users mit
// „seiner" MOCO-Person UND fürs Lohn-/Kostensatz-Erfassen. Daher auch für
// salary.manage / config.manage zugänglich (nur Namen, nicht sensibel).
export async function GET(req: NextRequest) {
  if (authEnabled()) {
    const user = await currentUser(req);
    const allowed = !!user && ["users.manage", "salary.manage", "config.manage"].some((c) => hasCapability(user, c));
    if (!allowed) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const config = readConfig();
  if (!config) return NextResponse.json({ users: [] });
  try {
    const users = await getUsers(config);
    return NextResponse.json({
      users: users
        .filter((u) => u.active)
        .map((u) => ({ id: u.id, name: `${u.firstname} ${u.lastname}`, email: u.email })),
    });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
