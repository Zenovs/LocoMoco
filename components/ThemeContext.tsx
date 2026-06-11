"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getIcon, type IconKey } from "@/lib/icons";

const Ctx = createContext<string>("girly");

// Beobachtet das aktive Theme (data-theme am <html>) und stellt es reaktiv
// bereit — so wechseln Icons live mit, auch bei der Theme-Vorschau im Setup.
export function ThemeWatcher({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("girly");
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setTheme(el.dataset.theme || "girly");
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return <Ctx.Provider value={theme}>{children}</Ctx.Provider>;
}

export function useThemeName(): string {
  return useContext(Ctx);
}

// Liefert eine Funktion ic(key) -> Emoji passend zum aktiven Theme.
export function useIcon() {
  const theme = useThemeName();
  return (key: IconKey) => getIcon(theme, key);
}
