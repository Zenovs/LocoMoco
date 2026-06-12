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
# Bevorzugt /Applications; ohne Schreibrecht (kein Admin) nach ~/Applications.
if [ -w /Applications ]; then APPDIR="/Applications"; else APPDIR="$HOME/Applications"; mkdir -p "$APPDIR"; fi
APP="$APPDIR/Loco Moco.app"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "⬇︎  Lade Loco Moco von $ZIP_URL …"
if ! curl -fsSL "$ZIP_URL" -o "$TMP/loco.zip" || [ ! -s "$TMP/loco.zip" ]; then
  echo "❌ Download fehlgeschlagen. Läuft der Server und stimmt die IP ($HOST)?" >&2
  exit 1
fi

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

# ---------------------------------------------------------------------------
# Lokale KI (Ollama) für die Loco-Chat-Funktion einrichten — läuft auf dem
# Gerät, keine Cloud. Optional abschaltbar mit LOCO_SKIP_OLLAMA=1.
# ---------------------------------------------------------------------------
LOCO_MODEL="${LOCO_MODEL:-qwen2.5:7b}"
setup_ollama() {
  [ "${LOCO_SKIP_OLLAMA:-0}" = "1" ] && return 0
  echo "🧠  Richte lokale KI (Ollama) ein…"

  if ! command -v ollama >/dev/null 2>&1; then
    if command -v brew >/dev/null 2>&1; then
      echo "    installiere Ollama via Homebrew…"
      brew install ollama >/dev/null 2>&1 || true
    fi
  fi
  local OB; OB="$(command -v ollama || true)"
  if [ -z "$OB" ]; then
    echo "    ⚠️  Ollama konnte nicht automatisch installiert werden. Loco-Chat zeigt dann einen Hinweis."
    echo "        Manuell: von ollama.com installieren, dann erneut ausführen."
    return 0
  fi

  # Laufende Instanzen stoppen, damit unsere mit CORS-Freigabe startet
  brew services stop ollama >/dev/null 2>&1 || true
  pkill -x ollama >/dev/null 2>&1 || true
  sleep 1

  # LaunchAgent: startet "ollama serve" mit CORS-Freigabe, auch nach Neustart.
  # OLLAMA_ORIGINS=* erlaubt der Loco-Moco-Seite den Zugriff auf das lokale LLM.
  local PLIST="$HOME/Library/LaunchAgents/ch.wireon.locomoco.ollama.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>ch.wireon.locomoco.ollama</string>
  <key>ProgramArguments</key><array><string>$OB</string><string>serve</string></array>
  <key>EnvironmentVariables</key><dict>
    <key>OLLAMA_ORIGINS</key><string>*</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardErrorPath</key><string>/tmp/locomoco-ollama.log</string>
</dict></plist>
PL
  launchctl unload "$PLIST" >/dev/null 2>&1 || true
  launchctl load -w "$PLIST" >/dev/null 2>&1 || true
  sleep 2

  # Modell holen — gross (~5 GB), daher im Hintergrund. Loco-Chat zeigt bis
  # dahin "Modell lädt".
  if ! "$OB" list 2>/dev/null | grep -q "${LOCO_MODEL%%:*}"; then
    echo "    ⬇︎  Lade KI-Modell $LOCO_MODEL (~5 GB, einmalig) im Hintergrund…"
    ( OLLAMA_ORIGINS="*" "$OB" pull "$LOCO_MODEL" > /tmp/locomoco-ollama-pull.log 2>&1 & )
  fi
  echo "    ✓  Ollama läuft. (Modell lädt ggf. noch im Hintergrund.)"
}
setup_ollama || true

echo "🚀  Starte Loco Moco …"
open "$APP"
echo "✅  Fertig."
