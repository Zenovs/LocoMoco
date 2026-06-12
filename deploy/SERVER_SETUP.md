# Loco Moco — zentraler Server (Ubuntu, LAN-only)

Schritt-für-Schritt, um Loco Moco auf dem Ubuntu-Rechner als Dienst laufen zu
lassen, mit **Auto-Deploy bei jedem Git-Push**. Alles im internen Netz, keine
offenen Ports nach außen.

> Etappe 1 = der jetzige MOCO-Stand läuft zentral. **Login/Rollen und die
> sensiblen Module (Lohn/Liquidität) kommen in Etappe 2/3** — bis dahin den
> Server nur im vertrauten LAN betreiben.

---

## 1. Grundpakete

```bash
sudo apt update && sudo apt install -y git curl
# Node.js 22 (NodeSource) + pnpm via corepack
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable            # stellt `pnpm` bereit
node --version && corepack pnpm --version
```

## 2. Dienst-Benutzer + App holen

```bash
sudo useradd --system --create-home --home /home/locomoco --shell /bin/bash locomoco
sudo mkdir -p /opt/locomoco && sudo chown locomoco:locomoco /opt/locomoco

sudo -u locomoco git clone https://github.com/Zenovs/LocoMoco.git /opt/locomoco/app
cd /opt/locomoco/app
sudo -u locomoco corepack pnpm install --frozen-lockfile
sudo -u locomoco corepack pnpm build
```

## 3. Deploy-Skript bereitlegen

```bash
sudo cp /opt/locomoco/app/deploy/deploy.sh /opt/locomoco/deploy.sh
sudo chmod +x /opt/locomoco/deploy.sh
sudo chown locomoco:locomoco /opt/locomoco/deploy.sh
```

## 4. Als Dienst einrichten

```bash
sudo cp /opt/locomoco/app/deploy/locomoco.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now locomoco
systemctl status locomoco        # sollte "active (running)" zeigen
```

Test im LAN: `http://<SERVER-IP>:4577` im Browser eines anderen Rechners.

## 5. MOCO-Zugang hinterlegen

Beim ersten Aufruf erscheint der Setup-Screen → MOCO-URL, Benutzername, API-Key
eintragen. Gespeichert wird das serverseitig unter
`/home/locomoco/.loco-moco/config.json` (nur für den Dienst-User lesbar).

> Empfehlung: **ein Admin-Key** (Personal-/Admin-Rechte). Damit sieht der Server
> alle nötigen Daten; *wer was sieht*, regeln wir später über Rollen.

## 6. Auto-Deploy: self-hosted Runner

Der Runner läuft auf dem Server, fragt GitHub nur ausgehend ab (kein Port-Forwarding nötig).

1. GitHub → Repo **Settings → Actions → Runners → New self-hosted runner** (Linux x64).
   Den dort gezeigten Befehlen folgen, dabei als Label **`locomoco`** vergeben.
   Installation am besten als eigener User, z. B.:

```bash
sudo useradd --system --create-home --shell /bin/bash ghrunner
sudo -u ghrunner -i      # dann den Anweisungen von GitHub folgen (config.sh …)
# Runner als Dienst:
sudo ./svc.sh install ghrunner
sudo ./svc.sh start
```

2. Dem Runner erlauben, den Dienst neu zu starten (sudoers):

```bash
echo 'ghrunner ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart locomoco' | sudo tee /etc/sudoers.d/locomoco
```

3. Dem Runner Schreibrechte auf die App geben (er ruft deploy.sh, das in
   `/opt/locomoco/app` zieht und baut):

```bash
sudo chown -R ghrunner:ghrunner /opt/locomoco
```
(`User=` im Dienst dann ebenfalls auf `ghrunner` setzen, oder eine gemeinsame
Gruppe nutzen — Hauptsache, der Runner darf in `/opt/locomoco/app` schreiben und
der Dienst daraus lesen/ausführen.)

Ab jetzt: **`git push` → GitHub-Action → `deploy.sh` → Dienst-Neustart.**

## 7. Firewall: nur LAN

```bash
sudo apt install -y ufw
sudo ufw allow from 192.168.0.0/16 to any port 4577 proto tcp   # ggf. dein Subnetz
sudo ufw enable
```
(Mit Caddy/HTTPS, Schritt 9: stattdessen Port 443 freigeben.)

## 8. Desktop-Rechner als Server — Stolperfallen

```bash
# Nicht schlafen legen / Bildschirm-Sperre stört den Dienst nicht, aber Suspend schon:
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```
Außerdem in den Ubuntu-Energieeinstellungen „Automatisches Aussetzen: Aus".
Der Dienst läuft auch ohne grafische Anmeldung (systemd, nicht an Login gebunden).

## 9. (Empfohlen vor sensiblen Daten) HTTPS + schöne URL via Caddy

```bash
sudo apt install -y caddy
sudo cp /opt/locomoco/app/deploy/Caddyfile /etc/caddy/Caddyfile
# In /etc/hosts der Clients (oder im internen DNS): <SERVER-IP> locomoco.intern
sudo systemctl restart caddy
sudo ufw allow from 192.168.0.0/16 to any port 443 proto tcp
```
Caddys interne Root-CA auf den Client-Macs vertrauen (einmalig), damit kein
Zertifikatswarnhinweis kommt — CA-Datei liegt unter
`/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt` auf dem Server;
auf dem Mac in die Schlüsselbund-Verwaltung importieren und „Immer vertrauen".

## 10. Portal + Mac-Client (Download-Hub an der Server-IP)

Ziel: An der **Server-IP** (`http://<SERVER-IP>/`) erscheint ein **Portal**, von
dem die Mitarbeitenden den **Loco-Moco-Mac-Client** herunterladen. Der Client ist
*dünn* — er hält keine Daten, sondern öffnet nur ein Fenster auf den Server
(`http://<SERVER-IP>:4577`). So lässt sich derselbe Server später für **weitere
Apps** nutzen (eigene Kachel + eigener Download).

**Voraussetzung:** Caddy aus Schritt 9 läuft (liefert Portal auf Port 80 aus).
Port 80 im LAN freigeben:

```bash
sudo ufw allow from 192.168.0.0/16 to any port 80 proto tcp
```

**Auslieferung:** `deploy.sh` spiegelt bei jedem Deploy automatisch
- `app/portal/*`            → `/opt/locomoco/portal/`   (Portal-Startseite)
- `app/deploy/downloads/*`  → `/opt/locomoco/downloads/` (die `.zip`-Clients)

Beim ersten Mal Caddy neu starten, danach läuft alles über den Auto-Deploy:

```bash
sudo cp /opt/locomoco/app/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

Test: `http://<SERVER-IP>/` zeigt das Portal; `http://<SERVER-IP>/downloads/`
listet die Clients.

### Client bauen / aktualisieren (auf einem Mac)

Der Mac-Client wird auf einem Mac kompiliert (Universal: Apple Silicon + Intel)
und das ZIP ins Repo gelegt — der Server liefert es dann automatisch aus:

```bash
scripts/build-client.sh                       # erzeugt dist/Loco-Moco-Mac.zip
cp dist/Loco-Moco-Mac.zip deploy/downloads/   # ins Repo übernehmen
git add deploy/downloads/Loco-Moco-Mac.zip && git commit -m "Client-Update" && git push
```

### So installiert der Mitarbeitende (steht auch auf dem Portal)
**Empfohlen — ein Terminal-Befehl** (das Portal zeigt ihn mit der richtigen IP):

```bash
curl -fsSL http://<SERVER-IP>/downloads/install-client.sh | LOCO_HOST=<SERVER-IP> bash
```

Installiert nach `/Applications`, hinterlegt die Server-Adresse und startet die
App — **keine Gatekeeper-Warnung**, weil `curl` (anders als der Browser) die
Datei nicht in Quarantäne stellt.

**Manuell (Fallback):** ZIP laden → „Loco Moco" nach Programme. Kommt beim Start
„Apple konnte nicht überprüfen…", einmal das Quarantäne-Flag entfernen:

```bash
xattr -dr com.apple.quarantine "/Applications/Loco Moco.app"
```
Danach öffnen und die **Server-Adresse** eingeben (z. B. `http://192.168.1.50:4577`).
Gespeichert in `~/.loco-moco-client/server.txt`; Menü **Ablage → Server ändern…**.

### Weitere App später hinzufügen
1. Neue Kachel in `portal/index.html` ergänzen (Name, Download-Link).
2. Deren Client-Paket nach `deploy/downloads/` legen.
3. Den neuen Dienst auf einem eigenen Port via systemd betreiben (analog
   `locomoco.service`); der Client zeigt dann auf `http://<SERVER-IP>:<port>`.

---

## Etappe 2
Login + Rollen sind aktiv (`LOCO_AUTH=1` + `AUTH_SECRET` im Dienst), bevor
Lohn/Liquidität dazukommen.
