#!/usr/bin/env bash
# Wird vom self-hosted GitHub-Actions-Runner bei jedem Push ausgeführt (oder
# manuell auf dem Server). Holt den neuen Stand, baut und startet den Dienst neu.
set -euo pipefail

APP_DIR="${LOCO_APP_DIR:-/opt/locomoco/app}"
PNPM="${LOCO_PNPM:-corepack pnpm}"

cd "$APP_DIR"

echo "[deploy] git pull …"
git fetch --all --prune
git reset --hard origin/main   # Server folgt strikt origin/main

echo "[deploy] Abhängigkeiten …"
if git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -q "pnpm-lock.yaml"; then
  $PNPM install --frozen-lockfile
else
  # beim ersten Mal / falls node_modules fehlt
  [ -d node_modules ] || $PNPM install --frozen-lockfile
fi

echo "[deploy] Build …"
$PNPM build

echo "[deploy] Dienst neu starten …"
sudo systemctl restart locomoco

echo "[deploy] fertig ✓ ($(git rev-parse --short HEAD))"
