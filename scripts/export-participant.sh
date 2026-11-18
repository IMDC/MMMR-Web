#!/usr/bin/env bash
#
# Export one participant's videos (and optionally their Mongo records) from the
# VPS to this machine.
#
#   ./scripts/export-participant.sh 507f1f77bcf86cd799439011
#   ./scripts/export-participant.sh <id> --videos-only
#   ./scripts/export-participant.sh <id> --out ~/Documents/study
#
# Run it from your laptop; it drives the server over SSH so there is no
# copy-pasting between two terminals and no date to keep in sync.
#
# Everything here is a copy. Nothing modifies or deletes the participant's live
# data. The one destructive step — removing the staging copy from the server —
# happens only after the local checksums pass, and only if you confirm.
#
# See docs/extraction.md for what this does step by step and why.

set -euo pipefail

# The VPS address is deliberately not in this file — the repo is public, and
# CLAUDE.md (which holds it) is gitignored for that reason. Either add a host
# alias to ~/.ssh/config:
#
#   Host mymissionmyrecord
#     HostName <ip>
#     Port     <port>
#     User     <user>
#
# or export MMMR_SSH_HOST / MMMR_SSH_PORT before running.
SSH_HOST="${MMMR_SSH_HOST:-mymissionmyrecord}"
SSH_PORT="${MMMR_SSH_PORT:-}"
BACKEND="mmmr-web-backend-1"
MONGO="mmmr-web-mongodb-1"

OUT_BASE="$HOME/Desktop"
WITH_MONGO=1
ID=""

bold()  { printf '\033[1m%s\033[0m\n' "$1"; }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn()  { printf '  \033[33m!\033[0m %s\n' "$1"; }
die()   { printf '\n\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

usage() {
  cat <<USAGE
Usage: $(basename "$0") <participant-object-id> [options]

  <participant-object-id>   24-character hex id, e.g. 507f1f77bcf86cd799439011
                            (hex only — not ObjectId('...'))

Options:
  --videos-only   Skip the Mongo export; take the .webm files only
  --out <dir>     Where to put the export (default: ~/Desktop)
  -h, --help      Show this

Environment:
  MMMR_SSH_HOST   default: $SSH_HOST  (a ~/.ssh/config alias)
  MMMR_SSH_PORT   default: taken from ~/.ssh/config
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --videos-only) WITH_MONGO=0; shift ;;
    --out)         OUT_BASE="${2:-}"; shift 2 ;;
    -h|--help)     usage; exit 0 ;;
    -*)            die "Unknown option: $1" ;;
    *)             [ -z "$ID" ] && ID="$1" || die "Unexpected argument: $1"; shift ;;
  esac
done

[ -n "$ID" ] || { usage; exit 1; }

# Catch the two mistakes that otherwise fail in confusing ways: pasting
# ObjectId('...') wholesale, and an empty or truncated id — which would make
# the server list every user folder and report a plausible-looking number.
echo "$ID" | grep -Eq '^[0-9a-fA-F]{24}$' \
  || die "Not a 24-character hex id: '$ID'
   Paste the hex only, e.g. 507f1f77bcf86cd799439011 — not ObjectId('...')."

# With a ~/.ssh/config alias the port comes from there, so only pass -p/-P when
# a port was given explicitly.
if [ -n "$SSH_PORT" ]; then SSH_OPTS="-p $SSH_PORT"; SCP_OPTS="-P $SSH_PORT"
else SSH_OPTS=""; SCP_OPTS=""; fi
SSH="ssh $SSH_OPTS $SSH_HOST"

# macOS ships `shasum` but not `sha256sum`; Git Bash and WSL ship `sha256sum`
# but usually not `shasum`. Both read the same manifest format, so just use
# whichever this machine has.
if command -v sha256sum >/dev/null 2>&1; then
  sha_check() { sha256sum -c "$1"; }
elif command -v shasum >/dev/null 2>&1; then
  sha_check() { shasum -a 256 -c "$1"; }
else
  die "Need sha256sum or shasum to verify the download, and found neither."
fi

# ── 1. Preflight ────────────────────────────────────────────────────────────
bold "Checking participant $ID on the server…"

PREFLIGHT=$($SSH bash -s -- "$ID" <<'REMOTE'
set -e
ID="$1"
docker exec mmmr-web-mongodb-1 mongosh mhmr --quiet --eval "
  const o = ObjectId('$ID');
  const u = db.users.findOne({_id:o},{username:1,displayName:1});
  print('USER='        + (u ? u.username : ''));
  print('DISPLAY='     + (u && u.displayName ? u.displayName : ''));
  print('VIDEOS='      + db.videodatas.countDocuments({userId:o}));
  print('TRANSCRIBED=' + db.videodatas.countDocuments({userId:o, isTranscribed:true}));
  print('SETS='        + db.videosets.countDocuments({userId:o}));
"
echo "FILES=$(docker exec mmmr-web-backend-1 sh -c "ls -1 /app/uploads/videos/$ID 2>/dev/null | wc -l" | tr -d ' ')"
echo "SIZE=$(docker exec mmmr-web-backend-1 sh -c "du -sh /app/uploads/videos/$ID 2>/dev/null | cut -f1" || echo '?')"
REMOTE
) || die "Could not reach the server, or the lookup failed."

get() { echo "$PREFLIGHT" | grep "^$1=" | head -1 | cut -d= -f2-; }
P_USER=$(get USER); P_DISPLAY=$(get DISPLAY)
P_VIDEOS=$(get VIDEOS); P_TRANS=$(get TRANSCRIBED)
P_SETS=$(get SETS); P_FILES=$(get FILES); P_SIZE=$(get SIZE)

[ -n "$P_USER" ] || die "No user with id $ID. Check the id and try again."

echo
echo "  participant   $P_USER  ($P_DISPLAY)"
echo "  videos        $P_VIDEOS   ($P_TRANS transcribed)"
echo "  video sets    $P_SETS"
echo "  files on disk $P_FILES   ($P_SIZE)"
echo

# A mismatch means an orphaned file, or a record whose file is gone. Worth
# knowing before it is archived, not after.
[ "$P_VIDEOS" = "$P_FILES" ] \
  || die "Mismatch: $P_VIDEOS video records but $P_FILES files on disk.
   Investigate before exporting — see docs/extraction.md."
ok "record count matches files on disk"

printf '\nExport this participant? [y/N] '
read -r REPLY </dev/tty
case "$REPLY" in [yY]*) ;; *) echo "Cancelled."; exit 0 ;; esac

# ── 2. Archive and stage on the server ──────────────────────────────────────
echo
bold "Archiving on the server…"

STAGED=$($SSH bash -s -- "$ID" "$WITH_MONGO" <<'REMOTE'
set -e
ID="$1"; WITH_MONGO="$2"
STAMP=$(date +%F-%H%M)
DIR=/var/tmp/export-$ID-$STAMP

# No gzip on the videos: .webm is already compressed, so it costs CPU and
# saves nothing.
docker exec mmmr-web-backend-1 sh -c "
  cd /app/uploads/videos &&
  sha256sum $ID/* > /tmp/manifest.txt &&
  tar cf /tmp/videos.tar $ID" >&2

mkdir -p "$DIR"
docker cp mmmr-web-backend-1:/tmp/videos.tar   "$DIR/" >&2
docker cp mmmr-web-backend-1:/tmp/manifest.txt "$DIR/" >&2
docker exec mmmr-web-backend-1 sh -c 'rm -f /tmp/videos.tar /tmp/manifest.txt' >&2

if [ "$WITH_MONGO" = "1" ]; then
  # Written to a file rather than inlined: quoting $oid through docker exec is
  # otherwise painful to get right.
  cat > /tmp/mongo-export.sh <<'SH'
#!/bin/sh
set -e
ID="$1"; OUT=/tmp/export
rm -rf "$OUT"; mkdir -p "$OUT"
for C in videodatas videosets contacts sharedcontents; do
  mongodump --db mhmr --collection "$C" \
    --query "{\"userId\":{\"\$oid\":\"$ID\"}}" --out "$OUT" --quiet
done
mongodump --db mhmr --collection users \
  --query "{\"_id\":{\"\$oid\":\"$ID\"}}" --out "$OUT" --quiet
SH
  docker cp /tmp/mongo-export.sh mmmr-web-mongodb-1:/tmp/mongo-export.sh >&2
  docker exec mmmr-web-mongodb-1 sh /tmp/mongo-export.sh "$ID" >&2
  docker exec mmmr-web-mongodb-1 tar czf /tmp/mongo-export.tgz -C /tmp export >&2
  docker cp mmmr-web-mongodb-1:/tmp/mongo-export.tgz "$DIR/" >&2
  docker exec mmmr-web-mongodb-1 sh -c 'rm -rf /tmp/export /tmp/mongo-export.tgz /tmp/mongo-export.sh' >&2
  rm -f /tmp/mongo-export.sh
fi

cd "$DIR" && sha256sum ./*.tar ./*.tgz 2>/dev/null > transfer.sha256 || true
echo "$DIR"
REMOTE
) || die "Archiving failed. Nothing was changed on the server."

ok "staged at $STAGED"

# ── 3. Pull it down ─────────────────────────────────────────────────────────
echo
bold "Downloading…"

DEST="$OUT_BASE/mmmr-export-$P_USER-$ID"
mkdir -p "$DEST"
scp $SCP_OPTS -q "$SSH_HOST:$STAGED/*" "$DEST/" \
  || die "Download failed. The staging copy is still on the server at:
   $STAGED"
ok "downloaded to $DEST"

# ── 4. Verify ───────────────────────────────────────────────────────────────
echo
bold "Verifying…"
cd "$DEST"

sha_check transfer.sha256 >/dev/null 2>&1 \
  || die "Transfer checksum failed — the archive did not survive the copy.
   Staging copy kept at: $STAGED"
ok "archives intact"

tar xf videos.tar
# The manifest was built with `cd /app/uploads/videos && sha256sum $ID/*`, so
# its paths are relative to the parent — check from here, not from inside $ID.
MATCHED=$(sha_check manifest.txt 2>/dev/null | grep -c ': OK$' || true)
[ "$MATCHED" = "$P_VIDEOS" ] \
  || die "Only $MATCHED of $P_VIDEOS files verified.
   Staging copy kept at: $STAGED"
ok "$MATCHED/$P_VIDEOS videos verified byte-for-byte"

if [ "$WITH_MONGO" = "1" ] && [ -f mongo-export.tgz ]; then
  mkdir -p mongo && tar xzf mongo-export.tgz -C mongo
  BSON=$(find mongo -name '*.bson' | wc -l | tr -d ' ')
  ok "$BSON Mongo collections exported"
fi

# ── 5. Offer to clean up the server ─────────────────────────────────────────
echo
bold "Done."
echo "  $DEST"
du -sh "$DEST" | sed 's/^/  /'
echo
echo "The staging copy on the server is plaintext health data on a"
echo "public-facing host. Remove it now that the local copy is verified?"
printf 'Delete %s ? [y/N] ' "$STAGED"
read -r REPLY </dev/tty
case "$REPLY" in
  [yY]*) $SSH "rm -rf '$STAGED'" && ok "removed from server" ;;
  *)     warn "left on the server — remember to remove it:"
         echo "       ssh $SSH_OPTS $SSH_HOST \"rm -rf '$STAGED'\"" ;;
esac

echo
echo "Move this folder to an encrypted drive — it is identifiable health data."
