import { NextResponse } from "next/server";
import { cacheClearAll } from "@/lib/moco/cache";

// Leert den kompletten MOCO-Cache (Memory + Disk), damit die nächste Abfrage
// frische Daten von MOCO holt. Vom "Aktualisieren"-Button aufgerufen.
export async function POST() {
  cacheClearAll();
  return NextResponse.json({ ok: true });
}
