#!/usr/bin/env bash
# Wird vom self-hosted GitHub-Actions-Runner bei jedem Push ausgeführt (oder
# manuell auf dem Server). Holt den neuen Stand, baut und startet den Dienst neu.
set -euo pipefail

APP_DIR="${LOCO_APP_DIR:-/opt/locomoco/app}"
PNPM="${LOCO_PNPM:-corepack pnpm}"

cd "$APP_DIR"

# Git-Sicherheitscheck "dubious ownership" entschärfen — sonst bricht der Deploy
# ab, wenn der ausführende User nicht exakt der Verzeichnis-Besitzer ist.
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

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

echo "[deploy] Portal & Client-Downloads …"
# Statisches Portal + herunterladbare Clients an feste Pfade spiegeln, die
# Caddy ausliefert. /opt/locomoco gehört dem locomoco-User -> kein sudo nötig.
PORTAL_DIR="${LOCO_PORTAL_DIR:-/opt/locomoco/portal}"
DL_DIR="${LOCO_DL_DIR:-/opt/locomoco/downloads}"
mkdir -p "$PORTAL_DIR" "$DL_DIR"
cp -f "$APP_DIR"/portal/* "$PORTAL_DIR"/ 2>/dev/null || true
# Downloads spiegeln. ABER: liegt ein vom Admin platzierter, GESCHLÜSSELTER
# Client (Marker-Datei .keyed) vor, NICHT mit dem schlüssellosen Repo-Paket
# überschreiben (sonst greift die Geräte-Sperre nicht mehr).
for f in "$APP_DIR"/deploy/downloads/*; do
  base="$(basename "$f")"
  if [ "$base" = "Loco-Moco-Mac.zip" ] && [ -f "$DL_DIR/.keyed" ]; then
    echo "[deploy]   behalte geschlüsselten Client (.keyed-Marker)"
    continue
  fi
  cp -f "$f" "$DL_DIR"/ 2>/dev/null || true
done

echo "[deploy] Dienst neu starten …"
sudo systemctl restart locomoco

echo "[deploy] fertig ✓ ($(git rev-parse --short HEAD))"
