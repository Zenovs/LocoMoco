import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getActivities, getInvoices } from "@/lib/moco/client";
import { getMonthRange } from "@/lib/metrics/dates";
import { requireCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";
import { readReleasedSalaries } from "@/lib/salary";
import { calcEconomics } from "@/lib/metrics/economics";
import { audit } from "@/lib/audit";
import type { MocoInvoice } from "@/types/moco";

export const dynamic = "force-dynamic";

// Wirtschaftlichkeit je Person — nur mit data.salary (sieht Kosten/Umsatz, nicht
// die Lohn-Rohwerte). Nur FREIGEGEBENE Löhne fliessen ein. Keine Ergebnis-
// Zwischenspeicherung: MOCO-Abrufe sind gecacht, Löhne werden frisch gelesen.
export async function GET(req: NextRequest) {
  const config = readConfig();
  if (!config) return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });

  let actorName = "lokal";
  let actorRole: string | undefined;
  if (authEnabled()) {
    const g = await requireCapability(req, "data.salary");
    if ("error" in g) return g.error;
    actorName = g.user.name; actorRole = g.user.role;
  }

  const salaries = readReleasedSalaries();
  if (Object.keys(salaries).length === 0) {
    return NextResponse.json({ people: [], hint: "Noch keine Löhne freigegeben." });
  }

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const year = Number(sp.get("year") ?? now.getFullYear());
  const month = Number(sp.get("month") ?? now.getMonth() + 1);
  audit(actorName, actorRole, "salary.view", `Wirtschaftlichkeit ${year}-${String(month).padStart(2, "0")}`);
  const { from, to } = getMonthRange(year, month);
  const selKey = `${year}-${String(month).padStart(2, "0")}`;

  try {
    const [activities, invoices] = await Promise.all([
      getActivities(config, from, to),
      getInvoices(config, from, to).catch(() => [] as MocoInvoice[]),
    ]);
    const people = calcEconomics(activities, invoices, salaries, selKey);
    return NextResponse.json({ people });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
