"use client";

import { useEffect } from "react";

const GLYPHS = ["✨", "💖", "⭐", "🩷", "💫", "🌸"];
const COUNT = 26;

export default function Sparkles() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const field = document.getElementById("sparkles");
    if (!field) return;

    for (let i = 0; i < COUNT; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      s.style.left = Math.random() * 100 + "vw";
      s.style.bottom = "-30px";
      s.style.fontSize = 10 + Math.random() * 16 + "px";
      const dur = 7 + Math.random() * 9;
      s.style.animationDuration = dur + "s";
      s.style.animationDelay = -Math.random() * dur + "s";
      field.appendChild(s);
    }
  }, []);

  return <div id="sparkles" aria-hidden="true" />;
}
