# 🍳 Loco Moco ✨

Ein verspieltes Analytics-Dashboard für dein [MOCO](https://www.mocoapp.com)-Zeiterfassungstool.
Läuft als **eigenständige Mac-App** in ihrem eigenen Fenster (kein Browser nötig) — der lokale
Server auf `http://localhost:4577` läuft dabei still im Hintergrund und zieht bei jedem Start
automatisch Updates von GitHub.

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

Nach der Installation erscheint **Loco Moco** mit eigenem Icon in Launchpad/Spotlight und im Ordner `~/Applications`. Einfach starten — oder im Terminal:

```bash
bash ~/.loco-moco/app/scripts/start.sh
```

Das Loco-Moco-Fenster öffnet sich automatisch.

## Erster Start

Beim ersten Aufruf erscheint ein Setup-Screen (später jederzeit über das ⚙️ oben rechts erreichbar).
Du brauchst:

- **MOCO-URL** — die volle Adresse (z. B. `https://schnyder.mocoapp.com`) oder nur die Subdomain (`schnyder`)
- **Benutzername** — dein MOCO-Login (Vorname Nachname); damit wird das Dashboard standardmäßig auf dich gesetzt
- **API-Key** — in MOCO unter **Profil → Integrations → API-Key**

> MOCO authentifiziert allein über den API-Key (`Authorization: Token …`). Der Benutzername ist
> kein Auth-Faktor, sondern legt nur fest, wessen Zahlen beim Start angezeigt werden.

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
| 2 | 🩷 Nicht-verrechenbar | Top 5 Projekte mit den meisten internen (nicht verrechenbaren) **Stunden** |
| 3 | 🚨 Über Budget | Projekte, auf die gebucht wurde und die über Budget sind |
| 4 | 😴 Schläferprojekte | Aktive Projekte ohne Buchung seit 60+ Tagen (global), inkl. **Kunde**; `Abonnement`-Projekte werden ignoriert |

## Weitere Funktionen

- **Mindestziel pro Mitarbeiter** 🎯 — direkt im Produktivitäts-Ring festlegen. Wird das Ziel
  verfehlt, erscheint der **Loco-Coach**: die größten internen **Zeitfresser** (Projekt · Aufgabe)
  plus konkrete, datenbasierte **Lösungsvorschläge**. Ziele liegen lokal in `~/.loco-moco/targets.json`.
- **Mitarbeiter-/Monatswahl** per Dropdown
- **Monatsvergleich** ⚖️ — zwei Monate grafisch nebeneinander (Produktivität, verrechenbare/total/interne Stunden mit Delta)
- **Bericht teilen / als PDF** — 📄 PDF (Sichern-Dialog) und ✉️ Teilen (macOS-Sheet: Mail, AirDrop …); auch über Menü **Ablage** (Cmd+P / Cmd+⇧+S)
- **🔄 Aktualisieren** — leert den Cache und holt frische Zahlen von MOCO

## Cache & Tempo

MOCO-Daten werden 20 Min lang zwischengespeichert (im RAM **und** auf der Platte unter
`~/.loco-moco/cache/`), damit auch frische App-Starts schnell sind. Mit **🔄 Aktualisieren**
lässt sich jederzeit neu laden. Schläferprojekte werden separat nachgeladen, damit das
Dashboard sofort erscheint.

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
