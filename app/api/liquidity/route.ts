import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";
import { readLiquidity } from "@/lib/liquidity";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Liquidität lesen — nur mit data.liquidity, und nur wenn freigegeben.
export async function GET(req: NextRequest) {
  let actorName = "lokal";
  let actorRole: string | undefined;
  if (authEnabled()) {
    const g = await requireCapability(req, "data.liquidity");
    if ("error" in g) return g.error;
    actorName = g.user.name; actorRole = g.user.role;
  }
  const l = readLiquidity();
  if (!l.released) return NextResponse.json({ released: false, months: {} });
  audit(actorName, actorRole, "liquidity.view");
  return NextResponse.json({ released: true, months: l.months });
}
