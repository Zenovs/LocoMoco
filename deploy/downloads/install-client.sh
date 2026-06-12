#!/usr/bin/env bash
# Loco-Moco-Mac-Client installieren — ohne Gatekeeper-Theater.
# Aufruf (vom Portal angezeigt, mit der richtigen Server-IP):
#   curl -fsSL http://<IP>/downloads/install-client.sh | LOCO_HOST=<IP> bash
#
# Lädt das App-ZIP, legt es nach /Applications, entfernt das Quarantäne-Flag,
# hinterlegt die Server-Adresse und startet die App. Da curl die Datei (anders
# als ein Browser) NICHT in Quarantäne stellt, erscheint keine Schadsoftware-
# Warnung.
set -euo pipefail

HOST="${LOCO_HOST:-}"
if [ -z "$HOST" ]; then
  echo "❌ LOCO_HOST fehlt. Bitte den Befehl von der Portal-Seite kopieren." >&2
  exit 1
fi

ZIP_URL="http://$HOST/downloads/Loco-Moco-Mac.zip"
SERVER_URL="http://$HOST:4577"
APP="/Applications/Loco Moco.app"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "⬇︎  Lade Loco Moco von $ZIP_URL …"
curl -fsSL "$ZIP_URL" -o "$TMP/loco.zip"

echo "📦  Entpacke …"
ditto -x -k "$TMP/loco.zip" "$TMP/unpacked"

# Die .app im entpackten Ordner finden (Name kann Leerzeichen enthalten)
SRC_APP="$(/usr/bin/find "$TMP/unpacked" -maxdepth 2 -name '*.app' -print -quit)"
if [ -z "$SRC_APP" ]; then echo "❌ Keine .app im ZIP gefunden." >&2; exit 1; fi

echo "📂  Installiere nach $APP …"
rm -rf "$APP"
ditto "$SRC_APP" "$APP"

# Quarantäne sicherheitshalber entfernen (falls doch gesetzt)
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true

echo "🔧  Server-Adresse: $SERVER_URL"
mkdir -p "$HOME/.loco-moco-client"
printf '%s' "$SERVER_URL" > "$HOME/.loco-moco-client/server.txt"

echo "🚀  Starte Loco Moco …"
open "$APP"
echo "✅  Fertig."
