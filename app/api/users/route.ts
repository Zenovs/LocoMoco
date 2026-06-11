import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { getUsers } from "@/lib/moco/client";
import { authEnabled } from "@/lib/session";
import { currentUser, hasCapability } from "@/lib/access";

export async function GET(req: NextRequest) {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 401 });
  }
  try {
    const users = await getUsers(config);

    // Ohne "alle sehen": nur die eigene verknüpfte MOCO-Person ausliefern,
    // damit auch die Mitarbeiterauswahl im Dashboard nur einen Eintrag hat.
    if (authEnabled()) {
      const me = await currentUser(req);
      if (me && !hasCapability(me, "data.all")) {
        return NextResponse.json(users.filter((u) => u.id === me.mocoUserId));
      }
    }
    return NextResponse.json(users);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Abrufen.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
