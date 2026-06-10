import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getUsers } from "@/lib/moco/client";

export async function GET() {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });
  }
  try {
    const users = await getUsers(config);
    return NextResponse.json(users);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Abrufen.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
