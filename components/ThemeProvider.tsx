"use client";

import { useEffect } from "react";

// Theme-Auflösung im Client:
//   1) das der angemeldeten Person zugewiesene Theme (zentral, Server-Modus)
//   2) sonst das gespeicherte Geräte-Theme (/api/theme)
export default function ThemeProvider() {
  useEffect(() => {
    (async () => {
      try {
        const me = await (await fetch("/api/auth/me")).json();
        if (me?.user?.theme) {
          document.documentElement.dataset.theme = me.user.theme;
          return;
        }
      } catch {
        /* ignore */
      }
      try {
        const t = await (await fetch("/api/theme")).json();
        if (t?.theme) document.documentElement.dataset.theme = t.theme;
      } catch {
        /* ignore */
      }
    })();
  }, []);
  return null;
}
