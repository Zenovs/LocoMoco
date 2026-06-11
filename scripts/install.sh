#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Zenovs/LocoMoco.git"
INSTALL_DIR="$HOME/.loco-moco/app"
# Bevorzugt das systemweite /Applications (dort sucht jeder), sonst ~/Applications.
if [[ -w /Applications ]]; then
  LAUNCHER_DIR="/Applications"
else
  LAUNCHER_DIR="$HOME/Applications"
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
step()   { printf '\n\033[1;35m▸ %s\033[0m\n' "$*"; }

echo ""
echo "  🍳  Loco Moco — Mac Installer"
echo "  ══════════════════════════════"
echo ""

# ── macOS check ───────────────────────────────────────────────────────────────
if [[ "$(uname -s)" != "Darwin" ]]; then
  red "Dieses Skript ist für macOS gemacht. Anderes System erkannt: $(uname -s)"
  exit 1
fi

# ── Xcode Command Line Tools ──────────────────────────────────────────────────
step "Xcode Command Line Tools"
if ! xcode-select -p &>/dev/null; then
  yellow "Werden jetzt installiert — bitte den Dialog bestätigen…"
  xcode-select --install 2>/dev/null || true
  # Warte bis die Installation fertig ist (max. ~20 Min), sonst klare Meldung
  for _ in $(seq 1 240); do
    xcode-select -p &>/dev/null && break
    sleep 5
  done
  if ! xcode-select -p &>/dev/null; then
    red "Xcode Command Line Tools wurden nicht installiert."
    red "Bitte den Installations-Dialog bestätigen und das Skript erneut starten."
    exit 1
  fi
  green "Fertig."
else
  green "Bereits vorhanden."
fi

# ── Homebrew ──────────────────────────────────────────────────────────────────
step "Homebrew"
if ! command -v brew &>/dev/null; then
  yellow "Homebrew wird installiert…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon: brew in PATH einbinden
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    # dauerhaft in .zprofile eintragen (falls noch nicht drin)
    if ! grep -q "homebrew" "$HOME/.zprofile" 2>/dev/null; then
      echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
    fi
  fi
  green "Homebrew installiert."
else
  green "Bereits vorhanden ($(brew --version | head -1))."
fi

# Sicherstellen dass brew im PATH ist (Apple Silicon)
if [[ -f /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# ── Git ───────────────────────────────────────────────────────────────────────
step "git"
if ! command -v git &>/dev/null; then
  yellow "git wird installiert…"
  brew install git
  green "git installiert."
else
  green "Bereits vorhanden ($(git --version))."
fi

# ── Node.js ───────────────────────────────────────────────────────────────────
step "Node.js (via nvm)"
export NVM_DIR="$HOME/.nvm"

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  yellow "nvm wird installiert…"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    red "nvm-Installation fehlgeschlagen — bitte Internetverbindung prüfen und erneut versuchen."
    exit 1
  fi
  green "nvm installiert."
fi

# nvm laden
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"

# nvm dauerhaft in Shell-Profile eintragen
for PROFILE in "$HOME/.zshrc" "$HOME/.bash_profile"; do
  if [[ -f "$PROFILE" ]] && ! grep -q "NVM_DIR" "$PROFILE"; then
    cat >> "$PROFILE" <<'NVM_SNIPPET'

# nvm (von Loco Moco Installer hinzugefügt)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
NVM_SNIPPET
  fi
done

NODE_WANT="22"
if nvm ls "$NODE_WANT" 2>/dev/null | grep -q "v$NODE_WANT"; then
  green "Node $NODE_WANT bereits installiert."
else
  yellow "Node $NODE_WANT wird installiert…"
  nvm install "$NODE_WANT"
  green "Node $NODE_WANT installiert."
fi
nvm use "$NODE_WANT"
nvm alias default "$NODE_WANT"
green "Aktiv: $(node --version)"

# ── pnpm ──────────────────────────────────────────────────────────────────────
step "pnpm"
if ! command -v pnpm &>/dev/null; then
  yellow "pnpm wird installiert…"
  npm install -g pnpm
  green "pnpm installiert."
else
  green "Bereits vorhanden ($(pnpm --version))."
fi

# ── Repo klonen oder updaten ───────────────────────────────────────────────────
step "Loco Moco App"
mkdir -p "$HOME/.loco-moco"

if [[ -d "$INSTALL_DIR/.git" ]]; then
  yellow "Repo bereits vorhanden — update…"
  git -C "$INSTALL_DIR" pull --ff-only
else
  yellow "Repo wird geklont nach $INSTALL_DIR …"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

# ── Abhängigkeiten & Build ────────────────────────────────────────────────────
step "Abhängigkeiten installieren"
pnpm --dir "$INSTALL_DIR" install --frozen-lockfile

step "App bauen"
pnpm --dir "$INSTALL_DIR" build

# ── Native App bauen ─────────────────────────────────────────────────────────
step "Standalone-App bauen"
mkdir -p "$LAUNCHER_DIR"

APP="$LAUNCHER_DIR/Loco Moco.app"
# Alte Launcher/Reste in BEIDEN möglichen Orten entfernen (kein Duplikat)
rm -rf "$HOME/Applications/Loco Moco.command" "/Applications/Loco Moco.command"
rm -rf "$HOME/Applications/Loco Moco.app" "/Applications/Loco Moco.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# Girly-Icon aus dem Repo übernehmen (vorgerendert)
cp "$INSTALL_DIR/assets/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"

cat >"$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>            <string>Loco Moco</string>
  <key>CFBundleDisplayName</key>     <string>Loco Moco</string>
  <key>CFBundleIdentifier</key>      <string>ch.zenovs.locomoco</string>
  <key>CFBundleVersion</key>         <string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key>     <string>APPL</string>
  <key>CFBundleExecutable</key>      <string>locomoco</string>
  <key>CFBundleIconFile</key>        <string>AppIcon</string>
  <key>LSMinimumSystemVersion</key>  <string>11.0</string>
  <key>NSHighResolutionCapable</key> <true/>
  <key>NSAppTransportSecurity</key>
  <dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict>
</plist>
PLIST

# Native Cocoa-App kompilieren (eigenes Fenster, kein Browser/Terminal).
# Fällt auf einen Terminal-Launcher zurück, falls swiftc nicht verfügbar ist.
if command -v swiftc &>/dev/null && \
   swiftc -O -framework Cocoa -framework WebKit \
          -o "$APP/Contents/MacOS/locomoco" \
          "$INSTALL_DIR/scripts/LocoMocoApp.swift" 2>/dev/null; then
  green "Native App kompiliert."
else
  yellow "swiftc nicht verfügbar — nutze Terminal-Launcher als Fallback."
  cat >"$APP/Contents/MacOS/locomoco" <<'LAUNCH'
#!/usr/bin/env bash
osascript -e 'tell application "Terminal" to activate' \
          -e "tell application \"Terminal\" to do script \"bash '$HOME/.loco-moco/app/scripts/start.sh'\""
LAUNCH
fi
chmod +x "$APP/Contents/MacOS/locomoco"

# Bundle ad-hoc signieren — sonst löscht Gatekeeper eine unsignierte App beim Start
codesign --force --deep -s - "$APP" 2>/dev/null || true
touch "$APP"
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -f "$APP" 2>/dev/null || true

green "App angelegt: $APP"

# ── Fertig ────────────────────────────────────────────────────────────────────
echo ""
green "════════════════════════════════════════"
green "  ✅  Loco Moco erfolgreich installiert!"
green "════════════════════════════════════════"
echo ""
echo "  Starten:"
echo "    • Im Launchpad/Spotlight nach 'Loco Moco' suchen, oder"
echo "    • Doppelklick auf:  $APP"
echo "    • Oder im Terminal: bash ~/.loco-moco/app/scripts/start.sh"
echo ""
yellow "  Tipp: Beim ersten Start öffnet sich ein Setup-Screen."
yellow "  Du brauchst: MOCO-URL, deinen Benutzernamen und den API-Key"
yellow "  (API-Key in MOCO → Profil → Integrations)."
echo ""
