#!/usr/bin/env bash
# Updates the running Hop to the latest commit of its branch on GitHub. Run it with:
#   sudo /opt/hop/deploy/update.sh
#
# 1. Backs up first: the off-site backup when it's set up, otherwise a local copy of the database.
# 2. Pulls, installs and builds as the hop account. If that fails, it goes back to the previous
#    version and rebuilds it without restarting Hop, so Hop keeps running as before.
# 3. Installs changed service files, restarts Hop and checks that it answers.
#
# Everything runs inside main(), which bash reads in full before starting, because updating the
# repository can replace this file while it runs.
set -euo pipefail

HOP_DIR="${HOP_DIR:-/opt/hop}"
HOP_ENV="${HOP_ENV:-/etc/hop/hop.env}"
UNIT_DIR="${UNIT_DIR:-/etc/systemd/system}"
COPY_DIR="${COPY_DIR:-/var/lib/hop-backup}"

as_hop() { sudo -u hop -H "$@"; }
hop_git() { as_hop git -C "$HOP_DIR" "$@"; }
build() { as_hop bash -c "cd '$HOP_DIR' && export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 && yarn install --immutable && yarn build"; }
step() { printf '\n==> %s\n' "$*"; }

main() {
  if [ "$(id -u)" != 0 ]; then
    echo "Run it with sudo: sudo $HOP_DIR/deploy/update.sh" >&2
    exit 1
  fi

  # Yarn rewrites this file on every install, and copies cloned before it was untracked still track it.
  hop_git checkout -q -- .yarn/install-state.gz 2>/dev/null || true

  if [ -n "$(hop_git status --porcelain)" ]; then
    echo "$HOP_DIR has local changes, so nothing was updated:" >&2
    hop_git status --short >&2
    exit 1
  fi

  hop_git fetch -q origin
  local before after
  before=$(hop_git rev-parse HEAD)
  after=$(hop_git rev-parse '@{u}')
  if [ "$before" = "$after" ]; then
    echo "Hop is already up to date: $(hop_git log -1 --format='%h %s')"
    exit 0
  fi

  step "New changes"
  hop_git log --oneline "$before..$after"

  step "Backing up"
  if [ -f "$UNIT_DIR/hop-offsite-backup.service" ]; then
    systemctl start hop-offsite-backup.service
    echo "Off-site backup done. A local copy of the database is in $COPY_DIR/hop.db."
  else
    install -d -o hop -g hop "$COPY_DIR"
    as_hop sqlite3 "$HOP_DIR/storage/hop.db" ".backup '$COPY_DIR/hop.db'"
    echo "No off-site backup is set up, so only a local copy was saved: $COPY_DIR/hop.db."
  fi

  step "Building"
  hop_git merge -q --ff-only "$after"
  if ! build; then
    echo "The build failed. Going back to $(hop_git log -1 --format=%h "$before") and rebuilding it; Hop was not restarted." >&2
    hop_git reset -q --hard "$before"
    if build; then
      echo "Hop keeps running the previous version." >&2
    else
      echo "Rebuilding the previous version failed too. Hop is still running, but don't restart it until this is fixed." >&2
    fi
    exit 1
  fi

  # Service files that are installed here and changed in this update. Edit them in deploy/, not in
  # $UNIT_DIR, or this replaces your edits.
  local unit reload=0
  for unit in hop.service hop-offsite-backup.service hop-offsite-backup.timer; do
    if [ -f "$UNIT_DIR/$unit" ] && ! cmp -s "$HOP_DIR/deploy/$unit" "$UNIT_DIR/$unit"; then
      install -m 644 "$HOP_DIR/deploy/$unit" "$UNIT_DIR/$unit"
      echo "Updated $UNIT_DIR/$unit"
      reload=1
    fi
  done
  if [ "$reload" = 1 ]; then
    systemctl daemon-reload
    systemctl try-restart hop-offsite-backup.timer
  fi
  if ! hop_git diff --quiet "$before" "$after" -- deploy/hop.env.example deploy/restic.env.example; then
    echo "The settings templates changed: compare $HOP_ENV with deploy/hop.env.example, and /etc/hop/restic.env with deploy/restic.env.example."
  fi

  step "Restarting Hop"
  systemctl restart hop
  local port
  port=$(sed -n 's/^PORT=//p' "$HOP_ENV" | tail -n 1)
  if curl -fs --retry 15 --retry-delay 1 --retry-connrefused "http://127.0.0.1:${port:-4321}/api/health" >/dev/null; then
    echo "Hop is running $(hop_git log -1 --format='%h %s')."
    echo "Close and reopen Hop on your devices to load the new version."
  else
    echo "Hop didn't answer after the restart. Its recent log:" >&2
    journalctl -u hop -n 30 --no-pager >&2
    echo "The database from before the update is in $COPY_DIR/hop.db." >&2
    exit 1
  fi
}

main "$@"
