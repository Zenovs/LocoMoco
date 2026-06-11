"use client";

import { useEffect } from "react";

// Übernimmt das gespeicherte Theme nach dem Laden (überschreibt den SSR-Default
// aus LOCO_THEME). Später kann hier das pro-User zugewiesene Theme einfließen.
export default function ThemeProvider() {
  useEffect(() => {
    fetch("/api/theme")
      .then((r) => r.json())
      .then((d: { theme?: string }) => {
        if (d.theme) document.documentElement.dataset.theme = d.theme;
      })
      .catch(() => {});
  }, []);
  return null;
}
