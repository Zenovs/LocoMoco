import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow serving from localhost only
  serverExternalPackages: [],
  // Erlaubt dem Auto-Updater, im Hintergrund in ein separates Verzeichnis zu
  // bauen (.next-staging-tmp), ohne den laufenden Server (.next) zu stören.
  distDir: process.env.LOCO_DIST_DIR || ".next",
};

export default nextConfig;
