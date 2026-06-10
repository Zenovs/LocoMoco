#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Zenovs/LocoMoco.git"
INSTALL_DIR="$HOME/.loco-moco/app"
LAUNCHER_DIR="$HOME/Applications"

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
  xcode-select --install
  # Warte bis die Installation fertig ist
  until xcode-select -p &>/dev/null; do sleep 5; done
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

# ── App-Bundle anlegen ───────────────────────────────────────────────────────
step "App-Icon anlegen"
mkdir -p "$LAUNCHER_DIR"

APP="$LAUNCHER_DIR/Loco Moco.app"
# Alte .command-Datei (frühere Versionen) entfernen
rm -rf "$LAUNCHER_DIR/Loco Moco.command"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# Girly-Icon aus dem Repo übernehmen (vorgerendert, kein Build nötig)
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
</dict>
</plist>
PLIST

# Executable: öffnet Terminal mit start.sh (sichtbare Logs, Auto-Update, Ctrl+C)
cat >"$APP/Contents/MacOS/locomoco" <<'LAUNCH'
#!/usr/bin/env bash
START="$HOME/.loco-moco/app/scripts/start.sh"
osascript <<OSA
tell application "Terminal"
  activate
  do script "bash \"$START\""
end tell
OSA
LAUNCH
chmod +x "$APP/Contents/MacOS/locomoco"

# Icon-Cache anstupsen & Quarantäne/Gatekeeper-Dialog vermeiden
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
echo "    • Doppelklick auf:  ~/Applications/Loco Moco.app"
echo "    • Oder im Terminal: bash ~/.loco-moco/app/scripts/start.sh"
echo ""
yellow "  Tipp: Beim ersten Start öffnet sich ein Setup-Screen."
yellow "  Du brauchst deine MOCO-Subdomain und den API-Key"
yellow "  (zu finden in MOCO → Profil → Integrations)."
echo ""
