#!/usr/bin/env bash
# Baut den dünnen Loco-Moco-Mac-Client zu einer .app und zippt sie für die
# Portal-Seite. Läuft auf macOS (braucht Xcode Command Line Tools / swiftc).
#
#   scripts/build-client.sh
#
# Ergebnis:  dist/Loco Moco.app   und   dist/Loco-Moco-Mac.zip
# Das ZIP nach deploy auf den Server unter /opt/locomoco/downloads/ legen
# (siehe deploy/SERVER_SETUP.md) — dann steht es am Portal zum Download.
set -euo pipefail

# Hüllen-Version. Bei jeder Änderung an LocoMocoClient.swift HOCHZÄHLEN — dann
# holen sich installierte Clients das Update automatisch (via version.json).
VERSION="${LOCO_CLIENT_VERSION:-2}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/scripts/LocoMocoClient.swift"
DIST="$ROOT/dist"
APP="$DIST/Loco Moco.app"
ZIP="$DIST/Loco-Moco-Mac.zip"
PUBLISH="$ROOT/deploy/downloads"   # was der Server ausliefert

if ! command -v swiftc >/dev/null 2>&1; then
  echo "❌ swiftc fehlt — bitte Xcode Command Line Tools installieren: xcode-select --install" >&2
  exit 1
fi

echo "🍳 Baue Loco-Moco-Client…"
rm -rf "$APP" "$ZIP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# 1) Binär kompilieren — Universal (Apple Silicon + Intel), damit es auf allen
#    Macs läuft. Falls eine Architektur nicht baubar ist, Fallback auf nativ.
OUT="$APP/Contents/MacOS/LocoMoco"
if swiftc -O -framework Cocoa -framework WebKit -target arm64-apple-macos12 -o "$DIST/.loco-arm64" "$SRC" 2>/dev/null \
   && swiftc -O -framework Cocoa -framework WebKit -target x86_64-apple-macos12 -o "$DIST/.loco-x86" "$SRC" 2>/dev/null; then
  lipo -create -output "$OUT" "$DIST/.loco-arm64" "$DIST/.loco-x86"
  rm -f "$DIST/.loco-arm64" "$DIST/.loco-x86"
  echo "   → Universal Binary (arm64 + x86_64)"
else
  echo "   → nur native Architektur (Cross-Compile nicht verfügbar)"
  swiftc -O -framework Cocoa -framework WebKit -o "$OUT" "$SRC"
fi

# 2) App-Icon — falls noch nicht erzeugt, aus make-icon.swift generieren.
ICON="$ROOT/scripts/assets/AppIcon.icns"
if [ ! -f "$ICON" ]; then
  echo "🎨 Erzeuge App-Icon…"
  mkdir -p "$ROOT/scripts/assets"
  swift "$ROOT/scripts/make-icon.swift" "$ICON" >/dev/null 2>&1 || echo "   (Icon-Erzeugung übersprungen)"
fi
[ -f "$ICON" ] && cp "$ICON" "$APP/Contents/Resources/AppIcon.icns"

# 3) Info.plist — http:// zum LAN-Server erlauben (ATS) + lokales Netz + Icon
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Loco Moco</string>
  <key>CFBundleDisplayName</key><string>Loco Moco</string>
  <key>CFBundleIdentifier</key><string>ch.wireon.locomoco.client</string>
  <key>CFBundleExecutable</key><string>LocoMoco</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.${VERSION}</string>
  <key>CFBundleVersion</key><string>${VERSION}</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSApplicationCategoryType</key><string>public.app-category.productivity</string>
  <key>NSLocalNetworkUsageDescription</key>
  <string>Loco Moco verbindet sich mit dem Server im lokalen Netzwerk.</string>
  <key>NSAppTransportSecurity</key><dict>
    <key>NSAllowsArbitraryLoads</key><true/>
    <key>NSAllowsLocalNetworking</key><true/>
  </dict>
</dict></plist>
PLIST

# 4) Ad-hoc signieren (sonst löscht Gatekeeper die App teils sofort)
codesign --force --deep -s - "$APP" >/dev/null 2>&1 || true

# 5) Zippen (ditto erhält Bundle-Struktur & Rechte)
cd "$DIST"
ditto -c -k --sequesterRsrc --keepParent "Loco Moco.app" "$ZIP"

# 6) Ins Repo publizieren: ZIP + version.json (Server liefert deploy/downloads aus).
#    Beim Deploy gespiegelt nach /opt/locomoco/downloads -> Clients sehen das Update.
mkdir -p "$PUBLISH"
cp -f "$ZIP" "$PUBLISH/Loco-Moco-Mac.zip"
cat > "$PUBLISH/version.json" <<JSON
{ "version": ${VERSION}, "url": "/downloads/Loco-Moco-Mac.zip" }
JSON

echo "✅ Fertig (v${VERSION}):"
echo "   App:      $APP"
echo "   ZIP:      $ZIP"
echo "   Publish:  $PUBLISH/Loco-Moco-Mac.zip + version.json"
echo "   → committen & pushen, dann ziehen sich Clients das Update automatisch."
