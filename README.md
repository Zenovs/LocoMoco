# 🍳 Loco Moco ✨

Ein verspieltes Analytics-Dashboard für dein [MOCO](https://www.mocoapp.com)-Zeiterfassungstool.
Läuft lokal auf `http://localhost:4577`, zieht bei jedem Start automatisch Updates von GitHub.

## Einmalige Installation

Das Skript installiert **alles Notwendige selbst** — du brauchst nichts vorinstalliert außer macOS.

Was automatisch installiert wird (falls nicht vorhanden):
- Xcode Command Line Tools
- Homebrew
- git
- Node.js 22 (via nvm)
- pnpm

### Option A — One-Liner (empfohlen)

Terminal öffnen und einfügen:

```bash
curl -fsSL https://raw.githubusercontent.com/Zenovs/LocoMoco/main/scripts/install.sh | bash
```

### Option B — Manuell

```bash
git clone https://github.com/Zenovs/LocoMoco.git ~/.loco-moco/app
bash ~/.loco-moco/app/scripts/install.sh
```

## Starten

Nach der Installation einfach Doppelklick auf **`~/Applications/Loco Moco.command`** — oder im Terminal:

```bash
bash ~/.loco-moco/app/scripts/start.sh
```

Der Browser öffnet sich automatisch auf `http://localhost:4577`.

## Erster Start

Beim ersten Aufruf erscheint ein Setup-Screen. Du brauchst:

- **Subdomain** — der Teil vor `.mocoapp.com` (z. B. `schnyder` für `schnyder.mocoapp.com`)
- **API-Key** — in MOCO unter **Profil → Integrations → API-Key**

Die Credentials werden lokal in `~/.loco-moco/config.json` (Mode 600) gespeichert — nie im Repo.

## Auto-Update

Bei jedem Start wird `git pull --ff-only` ausgeführt. Bei neuen Commits:
- Falls `pnpm-lock.yaml` sich änderte → `pnpm install`
- Build wird neu ausgeführt
- Dann startet die App

## Die vier Auswertungen

| # | Name | Was es zeigt |
|---|------|--------------|
| 1 | 💖 Produktivität | Verrechenbare ÷ Sollstunden im Monat, inkl. Delta zum Vormonat |
| 2 | 🩷 Nicht-verrechenbar | Top 5 Projekte mit höchstem Anteil interner Stunden |
| 3 | 🚨 Über Budget | Projekte, auf die gebucht wurde und die über Budget sind |
| 4 | 😴 Schläferprojekte | Aktive Projekte ohne Buchung seit 60+ Tagen (global) |

## Manuell updaten

```bash
cd ~/.loco-moco/app
git pull
pnpm install
pnpm build
```

---

<!-- Future: Upgrade auf Tauri v2 mit echtem Auto-Updater + Code-Signing möglich.
     Dann: src-tauri/ Verzeichnis anlegen, tauri.conf.json mit updater.endpoints konfigurieren,
     GitHub Releases mit pnpm tauri build --ci ausliefern. Aktuell nicht nötig für lokalen Use-Case. -->
