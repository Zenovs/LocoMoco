import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getActivitiesByProject } from "@/lib/moco/client";
import { toISODate, subtractDays } from "@/lib/metrics/dates";
import { currentUser, hasCapability } from "@/lib/access";
import { authEnabled } from "@/lib/session";

export const dynamic = "force-dynamic";

// Detail eines Projekts: wer hat worauf gebucht. Letzte 12 Monate.
// Wer "Alle sehen" hat, sieht alle Mitarbeiter; sonst nur die eigenen Einträge.
export async function GET(req: NextRequest) {
  const config = readConfig();
  if (!config) return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });

  const projectId = Number(req.nextUrl.searchParams.get("projectId"));
  if (!projectId) return NextResponse.json({ error: "projectId fehlt." }, { status: 400 });

  // Scoping: nur eigene Einträge, ausser man darf alle sehen.
  let restrictToUserId: number | null = null;
  if (authEnabled()) {
    const user = await currentUser(req);
    if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    if (!hasCapability(user, "data.all")) {
      if (!user.mocoUserId) return NextResponse.json({ people: [], hint: "Keine MOCO-Person zugewiesen." });
      restrictToUserId = user.mocoUserId;
    }
  }

  try {
    // Budget (geplante Stunden) + Lebenszeit-Gesamtstunden aus der Liste, um den
    // Über-Budget-Zeitpunkt korrekt zu bestimmen (auch wenn er vor dem Fenster lag).
    const planned = Number(req.nextUrl.searchParams.get("planned") || 0);
    const lifetimeTotal = Number(req.nextUrl.searchParams.get("total") || 0);

    const from = toISODate(subtractDays(new Date(), 365));
    const to = toISODate(new Date());
    const activities = await getActivitiesByProject(config, projectId, from, to);

    // Über-Budget-Zeitpunkt: chronologisch ALLE (auch fremde) Buchungen, kumuliert.
    // Startwert = Lebenszeit-Gesamt minus die Summe im Fenster (= Stunden davor).
    const windowedSum = activities.reduce((s, a) => s + a.hours, 0);
    const startBefore = Math.max(0, lifetimeTotal - windowedSum);
    const overBeforeWindow = planned > 0 && startBefore >= planned;
    let overBudgetSince: string | null = null;
    if (planned > 0 && !overBeforeWindow) {
      let running = startBefore;
      for (const a of [...activities].sort((x, y) => x.date.localeCompare(y.date))) {
        running += a.hours;
        if (running >= planned) { overBudgetSince = a.date; break; }
      }
    }

    const byUser = new Map<number, { name: string; total: number; billable: number; entries: { date: string; task: string; description: string; hours: number; billable: boolean }[] }>();
    for (const a of activities) {
      if (restrictToUserId && a.user.id !== restrictToUserId) continue;
      const cur = byUser.get(a.user.id) ?? { name: `${a.user.firstname} ${a.user.lastname}`.trim(), total: 0, billable: 0, entries: [] };
      cur.total += a.hours;
      if (a.billable) cur.billable += a.hours;
      cur.entries.push({
        date: a.date,
        task: a.task?.name ?? "",
        description: (a.description ?? "").trim(),
        hours: Math.round(a.hours * 10) / 10,
        billable: a.billable,
      });
      byUser.set(a.user.id, cur);
    }

    const people = [...byUser.values()]
      .map((p) => ({
        name: p.name,
        totalHours: Math.round(p.total * 10) / 10,
        billableHours: Math.round(p.billable * 10) / 10,
        entries: p.entries.sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    return NextResponse.json({ people, from, to, overBudgetSince, overBeforeWindow });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
