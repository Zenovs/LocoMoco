#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Zenovs/LocoMoco.git"
INSTALL_DIR="$HOME/.loco-moco/app"
LAUNCHER_DIR="$HOME/Applications"
LAUNCHER="$LAUNCHER_DIR/Loco Moco.command"

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

# ── Launcher anlegen ─────────────────────────────────────────────────────────
step "Launcher anlegen"
mkdir -p "$LAUNCHER_DIR"

# NVM_DIR im Launcher fest eintragen, da .command-Dateien keine Shell-Profile laden
cat >"$LAUNCHER" <<LAUNCHER_CONTENT
#!/usr/bin/env bash
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && source "\$NVM_DIR/nvm.sh"
nvm use 22 --silent 2>/dev/null || true
exec "\$HOME/.loco-moco/app/scripts/start.sh"
LAUNCHER_CONTENT

chmod +x "$LAUNCHER"

# macOS: Quarantine-Flag entfernen damit kein Gatekeeper-Dialog kommt
xattr -d com.apple.quarantine "$LAUNCHER" 2>/dev/null || true

green "Launcher angelegt: $LAUNCHER"

# ── Fertig ────────────────────────────────────────────────────────────────────
echo ""
green "════════════════════════════════════════"
green "  ✅  Loco Moco erfolgreich installiert!"
green "════════════════════════════════════════"
echo ""
echo "  Starten:"
echo "    • Doppelklick auf:  ~/Applications/Loco Moco.command"
echo "    • Oder im Terminal: bash ~/.loco-moco/app/scripts/start.sh"
echo ""
yellow "  Tipp: Beim ersten Start öffnet sich ein Setup-Screen."
yellow "  Du brauchst deine MOCO-Subdomain und den API-Key"
yellow "  (zu finden in MOCO → Profil → Integrations)."
echo ""
