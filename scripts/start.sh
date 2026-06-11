#!/usr/bin/env bash
set -euo pipefail

# Homebrew in PATH (für pnpm/git, falls aus der .app ohne Shell-Profil gestartet)
for BREW in /opt/homebrew/bin/brew /usr/local/bin/brew; do
  [ -x "$BREW" ] && eval "$("$BREW" shellenv)" && break
done

# nvm laden (wird bei .app/.command-Start nicht automatisch gemacht)
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
# Node 22 aktivieren; falls (noch) nicht vorhanden, einmalig nachinstallieren
nvm use 22 --silent 2>/dev/null || nvm install 22 2>/dev/null || true

APP_DIR="$HOME/.loco-moco/app"
PORT=4577

cd "$APP_DIR"

BUILT_FILE="$HOME/.loco-moco/built-commit"     # Commit, aus dem das aktive .next gebaut ist
STAGING_FILE="$HOME/.loco-moco/staging-commit" # Commit, aus dem .next-staging gebaut ist

# Reste eines abgebrochenen Hintergrund-Builds entfernen
rm -rf .next-staging-tmp 2>/dev/null || true

# 1) In der letzten Sitzung fertig vorbereitetes Update sofort aktivieren (instant)
if [[ -d .next-staging ]]; then
  echo "🆕  Update wird aktiviert…"
  rm -rf .next && mv .next-staging .next
  [[ -f "$STAGING_FILE" ]] && mv "$STAGING_FILE" "$BUILT_FILE"
fi

# 2) Allererster Start ohne Build -> einmalig blockierend bauen
if [[ ! -d .next ]]; then
  echo "🔨  Erststart — wird gebaut…"
  [[ -f pnpm-lock.yaml ]] && pnpm install --frozen-lockfile
  pnpm build
  git rev-parse HEAD > "$BUILT_FILE" 2>/dev/null || true
fi

# Migration: bestehendes .next ohne Vermerk als aktuell betrachten
if [[ -d .next && ! -f "$BUILT_FILE" ]]; then
  git rev-parse HEAD > "$BUILT_FILE" 2>/dev/null || true
fi

# 3) Updates im HINTERGRUND vorbereiten — blockiert den Start NICHT.
#    Es wird in ein separates Verzeichnis gebaut, damit der laufende Server
#    (.next) unberührt bleibt; aktiviert wird das Update beim nächsten Start.
#    Gebaut wird, solange .next nicht dem aktuellen Commit entspricht (robust
#    auch nach Abbruch).
(
  git pull --ff-only >/dev/null 2>&1 || true
  head=$(git rev-parse HEAD 2>/dev/null || echo none)
  built=$(cat "$BUILT_FILE" 2>/dev/null || echo none)
  if [[ "$head" != "$built" ]]; then
    if git diff --name-only "$built" "$head" 2>/dev/null | grep -q "pnpm-lock.yaml"; then
      pnpm install --frozen-lockfile >/dev/null 2>&1 || exit 0
    fi
    if LOCO_DIST_DIR=.next-staging-tmp pnpm build >/dev/null 2>&1; then
      rm -rf .next-staging && mv .next-staging-tmp .next-staging
      echo "$head" > "$STAGING_FILE"
    else
      rm -rf .next-staging-tmp
    fi
  fi
) >/dev/null 2>&1 &

echo ""
echo "  🍳  Loco Moco startet auf http://localhost:$PORT"
echo ""

# Browser öffnen (kurz warten bis Server ready) – entfällt, wenn die native App
# startet (die zeigt das Dashboard in ihrem eigenen Fenster).
if [[ -z "${LOCO_NO_BROWSER:-}" ]]; then
  (sleep 2 && open "http://localhost:$PORT") &
fi

exec pnpm start
