"use client";

import { useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";
import Sparkles from "@/components/Sparkles";

export default function Home() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { configured: boolean }) => setConfigured(d.configured))
      .catch(() => setConfigured(false));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { capabilities?: string[] }) => setCanManage((d.capabilities ?? []).includes("config.manage")))
      .catch(() => {});
  }, []);

  if (configured === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ fontFamily: "var(--font-body)", color: "var(--hotpink)" }} className="text-lg animate-pulse">
          Loco Moco lädt… ✨
        </p>
      </div>
    );
  }

  return (
    <>
      <Sparkles />
      {configured ? (
        <Dashboard />
      ) : (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="card" style={{ maxWidth: 460, textAlign: "center" }}>
            <h2 style={{ fontSize: 18, color: "var(--plum)", marginBottom: 8 }}>Noch nicht mit MOCO verbunden</h2>
            <p style={{ fontSize: 14, color: "var(--plum-soft)", fontWeight: 600 }}>
              Die Verbindung richtet die Administration im Admin-Panel ein.
            </p>
            {canManage && (
              <a href="/admin" className="chip active" style={{ display: "inline-block", marginTop: 16, textDecoration: "none" }}>
                🔌 Zum Admin-Panel
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
