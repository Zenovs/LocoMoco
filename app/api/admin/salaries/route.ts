import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";
import { readSalaries, writeSalary, deleteSalary, vollkosten, type Salaries } from "@/lib/salary";

// Löhne erfassen/freigeben — nur mit salary.manage. Liefert die ROHWERTE
// (Bruttolohn/Faktor) — daher streng gated.
async function guard(req: NextRequest) {
  if (!authEnabled()) return null;
  const g = await requireCapability(req, "salary.manage");
  return "error" in g ? g.error : null;
}

function withCost(s: Salaries) {
  return Object.fromEntries(
    Object.entries(s).map(([k, v]) => [k, { ...v, vollkosten: vollkosten(v) }])
  );
}

export async function GET(req: NextRequest) {
  const err = await guard(req);
  if (err) return err;
  return NextResponse.json({ salaries: withCost(readSalaries()) });
}

export async function POST(req: NextRequest) {
  const err = await guard(req);
  if (err) return err;

  let b: { userId?: number; grossMonthly?: number; factor?: number; sellRate?: number; released?: boolean; delete?: boolean };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }
  if (b.userId == null) return NextResponse.json({ error: "userId fehlt." }, { status: 400 });

  const salaries = b.delete
    ? deleteSalary(Number(b.userId))
    : writeSalary(Number(b.userId), {
        grossMonthly: b.grossMonthly,
        factor: b.factor,
        sellRate: b.sellRate,
        released: b.released,
      });
  return NextResponse.json({ ok: true, salaries: withCost(salaries) });
}
