"use client";

import { useEffect, useState } from "react";
import { useIcon } from "./ThemeContext";

const WISDOMS = [
  "Nicht jede Stunde muss verrechenbar sein — aber die meisten schon. 😇",
  "Erst der Kaffee, dann die Deadline. ☕✨",
  "Ordnung ist das halbe Leben. Die andere Hälfte ist Glitzer. 💅",
  "Wer Zeit erfasst, hat sie nicht verloren — nur dokumentiert. 📊",
  "Ein Projekt ohne Budget ist wie Prosecco ohne Bläschen. 🥂",
  "Multitasking ist, wenn man gleichzeitig nichts fertig macht. 🦄",
  "Pausen sind keine verlorene Zeit, sondern Investitionen in Glanz. 🌸",
  "Manche Projekte schlafen. Lass sie nicht überwintern. 😴",
  "Done ist das neue Perfekt. 💖",
  "Heute schon jemanden zum Lächeln gebracht? Zählt auch als Produktivität. 😊",
  "Die beste Deadline ist die, die man nicht erst um 23:59 sieht. 🌙",
  "Glitzer macht alles besser — sogar Excel. ✨",
  "Wer misst, weiß. Wer weiß, kann früher Feierabend machen. 🎀",
  "Kleine Schritte sind auch Schritte. Mit Absätzen sowieso. 👠",
  "Energie folgt der Aufmerksamkeit. Und dem Schoggi-Gipfeli. 🥐",
  "Ein aufgeräumtes MOCO ist ein aufgeräumter Kopf. 🧁",
];

export default function LoadingScreen() {
  const [idx, setIdx] = useState(0);
  const ic = useIcon();

  useEffect(() => {
    setIdx(Math.floor(performance.now()) % WISDOMS.length);
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % WISDOMS.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div style={{ display: "grid", placeItems: "center", padding: "72px 16px 56px" }}>
      <div style={{ position: "relative", width: 150, height: 150, marginBottom: 26 }}>
        {/* pulsierender Glanz-Ring */}
        <div className="lm-ring" />
        {/* hüpfendes Theme-Icon */}
        <div className="lm-egg">{ic("loading")}</div>
        {/* umkreisende Funkel */}
        <div className="lm-orbit">
          <span className="lm-orbit-item" style={{ "--a": "0deg" } as React.CSSProperties}>{ic("sparkleA")}</span>
          <span className="lm-orbit-item" style={{ "--a": "120deg" } as React.CSSProperties}>{ic("sparkleB")}</span>
          <span className="lm-orbit-item" style={{ "--a": "240deg" } as React.CSSProperties}>{ic("sparkleC")}</span>
        </div>
      </div>

      <h2 className="lm-title">Zahlen werden geholt…</h2>

      {/* indeterminater Glitzer-Balken */}
      <div className="lm-track">
        <div className="lm-fill" />
      </div>

      {/* rotierende Lebensweisheit */}
      <p key={idx} className="lm-wisdom">
        {WISDOMS[idx]}
      </p>

      <style>{`
        .lm-ring {
          position: absolute; inset: 0; border-radius: 50%;
          background: conic-gradient(from 0deg, var(--ring-stops));
          filter: blur(8px); opacity: .6;
          animation: lm-spin 3.2s linear infinite, lm-breathe 2.4s ease-in-out infinite;
        }
        .lm-egg {
          position: absolute; inset: 0; display: grid; place-items: center;
          font-size: 74px; animation: lm-bounce 1.5s cubic-bezier(.5,0,.5,1) infinite;
          filter: drop-shadow(0 8px 14px var(--glow));
        }
        .lm-orbit { position: absolute; inset: 0; animation: lm-spin 6s linear infinite; }
        .lm-orbit-item {
          position: absolute; top: 50%; left: 50%; font-size: 24px;
          transform: rotate(var(--a)) translateX(82px) rotate(calc(-1 * var(--a)));
          animation: lm-twinkle 1.8s ease-in-out infinite;
        }
        .lm-title {
          font-family: var(--font-heading); font-weight: 700; font-size: 1.35rem;
          background: var(--holo);
          background-size: 220% 220%; -webkit-background-clip: text; background-clip: text;
          color: transparent; animation: lm-shimmer 4s ease-in-out infinite; margin-bottom: 16px;
        }
        .lm-track {
          width: 230px; max-width: 70vw; height: 10px; border-radius: 999px;
          background: var(--bar-bg); overflow: hidden; margin-bottom: 22px;
        }
        .lm-fill {
          height: 100%; width: 42%; border-radius: 999px;
          background: var(--accent-grad);
          box-shadow: 0 0 12px var(--glow);
          animation: lm-slide 1.5s ease-in-out infinite;
        }
        .lm-wisdom {
          max-width: 440px; text-align: center; font-family: var(--font-body);
          font-weight: 600; font-size: 1.02rem; color: var(--plum-soft); min-height: 48px;
          animation: lm-fadein .6s ease both;
        }
        @keyframes lm-bounce { 0%,100%{transform:translateY(4px) scale(1)} 50%{transform:translateY(-10px) scale(1.06)} }
        @keyframes lm-spin { to { transform: rotate(360deg); } }
        @keyframes lm-breathe { 0%,100%{opacity:.45} 50%{opacity:.8} }
        @keyframes lm-twinkle { 0%,100%{opacity:.45; transform: rotate(var(--a)) translateX(82px) rotate(calc(-1 * var(--a))) scale(.8)} 50%{opacity:1; transform: rotate(var(--a)) translateX(82px) rotate(calc(-1 * var(--a))) scale(1.2)} }
        @keyframes lm-shimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes lm-slide { 0%{transform:translateX(-120%)} 100%{transform:translateX(360%)} }
        @keyframes lm-fadein { from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:translateY(0)} }
        @media (prefers-reduced-motion: reduce) {
          .lm-ring,.lm-egg,.lm-orbit,.lm-orbit-item,.lm-fill,.lm-title { animation-duration: 6s; }
        }
      `}</style>
    </div>
  );
}
