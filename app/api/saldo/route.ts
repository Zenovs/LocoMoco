import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getActivities, getEmployments, getSchedules } from "@/lib/moco/client";
import { subtractDays } from "@/lib/metrics/dates";
import { scopedUserId } from "@/lib/access";
import { calcCumulativeSaldo } from "@/lib/metrics/saldo";

export const dynamic = "force-dynamic";

// Kumuliertes Über-/Minusstunden-Saldo seit Jahresbeginn bis zum betrachteten
// Monat (im laufenden Monat bis gestern). Eigener, lazy ladender Endpunkt.
export async function GET(req: NextRequest) {
  const config = readConfig();
  if (!config) return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const year = Number(sp.get("year") ?? now.getFullYear());
  const month = Number(sp.get("month") ?? now.getMonth() + 1);

  const scope = await scopedUserId(req, Number(sp.get("userId")));
  if ("error" in scope) return scope.error;
  const userId = scope.userId;
  if (!userId) return NextResponse.json({ error: "userId fehlt." }, { status: 400 });

  // Zeitraum: 1. Januar des betrachteten Jahres bis Ende des Monats, aber nie
  // über gestern hinaus (heute läuft noch).
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-01-01`;
  const endOfMonth = new Date(year, month, 0);
  const yesterday = subtractDays(now, 1);
  const toDate = endOfMonth < yesterday ? endOfMonth : yesterday;
  const to = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}`;

  if (to < from) {
    return NextResponse.json({ saldo: 0, recorded: 0, soll: 0, absenceHours: 0, from, to });
  }

  try {
    const [activities, employments, schedules] = await Promise.all([
      getActivities(config, from, to, userId),
      getEmployments(config),
      getSchedules(config, from, to, userId),
    ]);
    const result = calcCumulativeSaldo(activities, employments, schedules, userId, from, to);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
