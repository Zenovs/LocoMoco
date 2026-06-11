"use client";

import { useEffect } from "react";
import { useThemeName } from "./ThemeContext";
import { getIcon } from "@/lib/icons";

const COUNT = 26;

export default function Sparkles() {
  const theme = useThemeName();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const field = document.getElementById("sparkles");
    if (!field) return;
    field.innerHTML = "";

    const glyphs = [getIcon(theme, "sparkleA"), getIcon(theme, "sparkleB"), getIcon(theme, "sparkleC")];
    for (let i = 0; i < COUNT; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      s.style.left = Math.random() * 100 + "vw";
      s.style.bottom = "-30px";
      s.style.fontSize = 10 + Math.random() * 16 + "px";
      const dur = 7 + Math.random() * 9;
      s.style.animationDuration = dur + "s";
      s.style.animationDelay = -Math.random() * dur + "s";
      field.appendChild(s);
    }
  }, [theme]);

  return <div id="sparkles" aria-hidden="true" />;
}
