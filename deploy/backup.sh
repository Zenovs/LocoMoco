#!/usr/bin/env bash
# Sichert die sensiblen Loco-Moco-Daten (~/.loco-moco: config, users, roles,
# targets, rates, salaries, liquidity, theme) als datiertes Tar-Archiv.
# Aufruf manuell oder via systemd-Timer (deploy/locomoco-backup.timer).
set -euo pipefail

DATA="${LOCO_DATA_DIR:-$HOME/.loco-moco}"
DEST="${LOCO_BACKUP_DIR:-$HOME/loco-moco-backups}"
KEEP="${LOCO_BACKUP_KEEP:-14}"

if [ ! -d "$DATA" ]; then
  echo "Keine Daten unter $DATA — nichts zu sichern." >&2
  exit 0
fi

mkdir -p "$DEST"
TS="$(date +%Y-%m-%d_%H%M%S)"
ARCHIVE="$DEST/loco-moco-$TS.tar.gz"

# Nur die JSON-Daten sichern, nicht den (großen, regenerierbaren) Cache.
tar czf "$ARCHIVE" --exclude='cache' -C "$(dirname "$DATA")" "$(basename "$DATA")"
chmod 600 "$ARCHIVE"

# Alte Backups aufräumen (die neuesten KEEP behalten).
ls -1t "$DEST"/loco-moco-*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f

echo "✓ Backup: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
