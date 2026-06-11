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

---

## Danach
- **Mac-App als Hülle:** die native App zeigt künftig `https://locomoco.intern`
  statt `localhost` — kommt als nächster Schritt (eigene, schlanke Launcher-Variante).
- **Etappe 2:** Login + Rollen, bevor Lohn/Liquidität dazukommen.
