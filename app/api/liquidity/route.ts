import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";
import { readLiquidity } from "@/lib/liquidity";

export const dynamic = "force-dynamic";

// Liquidität lesen — nur mit data.liquidity, und nur wenn freigegeben.
export async function GET(req: NextRequest) {
  if (authEnabled()) {
    const g = await requireCapability(req, "data.liquidity");
    if ("error" in g) return g.error;
  }
  const l = readLiquidity();
  if (!l.released) return NextResponse.json({ released: false, months: {} });
  return NextResponse.json({ released: true, months: l.months });
}
