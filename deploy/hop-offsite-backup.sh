#!/usr/bin/env bash
# Nightly off-site copy of Hop's data, run by hop-offsite-backup.timer.
# restic encrypts everything on this server before uploading, so the storage provider
# only ever sees ciphertext. Repository and credentials come from /etc/hop/restic.env.
set -euo pipefail

storage="${HOP_STORAGE:-/opt/hop/storage}"
staging="${STATE_DIRECTORY:-/var/lib/hop-backup}"

# sqlite3 creates an empty database when the path is wrong, which would back up nothing.
if [ ! -s "$storage/hop.db" ]; then
  echo "No database at $storage/hop.db; nothing backed up." >&2
  exit 1
fi

# A consistent copy of the live database, safe to take while Hop is writing to it.
sqlite3 "$storage/hop.db" ".backup '$staging/hop.db'"

# The database copy covers everything up to now; the daily JSON backups are what
# Settings → Backup and export → Restore reads.
restic backup --tag hop "$staging/hop.db" "$storage/backups"
restic forget --tag hop --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune

# On Sundays, read back part of the uploaded data to catch silent corruption early.
if [ "$(date +%u)" = 7 ]; then
  restic check --read-data-subset=10%
fi
