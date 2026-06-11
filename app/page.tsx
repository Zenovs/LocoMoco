"use client";

import { useEffect, useState } from "react";
import SetupScreen from "@/components/SetupScreen";
import Dashboard from "@/components/Dashboard";
import Sparkles from "@/components/Sparkles";

export default function Home() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { configured: boolean }) => setConfigured(d.configured))
      .catch(() => setConfigured(false));
  }, []);

  if (configured === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p
          style={{ fontFamily: "var(--font-body)", color: "var(--pink)" }}
          className="text-lg animate-pulse"
        >
          Loco Moco lädt… ✨
        </p>
      </div>
    );
  }

  return (
    <>
      <Sparkles />
      {configured ? (
        <Dashboard onSettingsChange={() => setConfigured(false)} />
      ) : (
        <SetupScreen onSuccess={() => setConfigured(true)} />
      )}
    </>
  );
}
