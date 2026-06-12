import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";
import { readLiquidity, writeLiquidityMonth, setLiquidityReleased } from "@/lib/liquidity";

// Liquidität erfassen/freigeben — nur mit liquidity.manage.
async function guard(req: NextRequest) {
  if (!authEnabled()) return null;
  const g = await requireCapability(req, "liquidity.manage");
  return "error" in g ? g.error : null;
}

export async function GET(req: NextRequest) {
  const err = await guard(req);
  if (err) return err;
  return NextResponse.json(readLiquidity());
}

export async function POST(req: NextRequest) {
  const err = await guard(req);
  if (err) return err;

  let b: { month?: string; balance?: number; income?: number; expense?: number; note?: string; delete?: boolean; released?: boolean };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  if (b.released != null && b.month == null) {
    return NextResponse.json({ ok: true, ...setLiquidityReleased(!!b.released) });
  }
  if (!b.month) return NextResponse.json({ error: "month fehlt (YYYY-MM)." }, { status: 400 });

  const l = b.delete
    ? writeLiquidityMonth(b.month, null)
    : writeLiquidityMonth(b.month, { balance: b.balance, income: b.income, expense: b.expense, note: b.note });
  return NextResponse.json({ ok: true, ...l });
}
