import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { readConfig } from "@/lib/config";
import { getUsers } from "@/lib/moco/client";

// Liste der MOCO-Personen (id + Name) — um einen LocoMoco-User mit „seiner"
// MOCO-Person zu verknüpfen (für „nur eigene Daten").
export async function GET(req: NextRequest) {
  const guard = await requireCapability(req, "users.manage");
  if ("error" in guard) return guard.error;

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
