import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";
import { readAudit } from "@/lib/audit";

// Zugriffsprotokoll (sensible Daten) — nur für die Benutzerverwaltung.
export async function GET(req: NextRequest) {
  if (authEnabled()) {
    const g = await requireCapability(req, "users.manage");
    if ("error" in g) return g.error;
  }
  return NextResponse.json({ entries: readAudit() });
}
