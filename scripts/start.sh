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
nvm use 22 --silent 2>/dev/null || true

APP_DIR="$HOME/.loco-moco/app"
PORT=4577

cd "$APP_DIR"

echo "🔄  Update wird geprüft…"
COMMIT_BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "none")

if git pull --ff-only 2>/dev/null; then
  COMMIT_AFTER=$(git rev-parse HEAD)
  if [[ "$COMMIT_BEFORE" != "$COMMIT_AFTER" ]]; then
    echo "🆕  Neue Version — wird gebaut…"
    if git diff --name-only "$COMMIT_BEFORE" "$COMMIT_AFTER" 2>/dev/null | grep -q "pnpm-lock.yaml"; then
      echo "📦  Abhängigkeiten aktualisieren…"
      pnpm install --frozen-lockfile
    fi
    echo "🔨  Build…"
    pnpm build
    echo "✅  Update fertig!"
  else
    echo "✅  Bereits aktuell."
  fi
else
  echo "⚠️  Kein Netz oder Merge-Konflikt — starte mit vorhandener Version."
fi

echo ""
echo "  🍳  Loco Moco startet auf http://localhost:$PORT"
echo ""

# Browser öffnen (kurz warten bis Server ready) – entfällt, wenn die native App
# startet (die zeigt das Dashboard in ihrem eigenen Fenster).
if [[ -z "${LOCO_NO_BROWSER:-}" ]]; then
  (sleep 2 && open "http://localhost:$PORT") &
fi

exec pnpm start
