# Participant Data Extraction — Runbook

> For taking a copy of one participant's videos and database records off the VPS
> once they have finished the study. Every step below is a **copy**: nothing
> here modifies or deletes the participant's live data.

The two halves are independent. Videos must come off the VPS; the Mongo records
can be done either on the VPS or through Compass, whichever you prefer.

---

## The short version

```bash
./scripts/export-participant.sh <24-char-hex-id>
```

Run it from your laptop. It checks the participant, shows you who they are and
what will be copied, stops if anything looks wrong, pulls the archive down,
verifies every file byte-for-byte, and offers to clear the staging copy off the
server.

Options: `--videos-only` to skip the Mongo export, `--out <dir>` to put it
somewhere other than `~/Desktop`. If your SSH details differ, set
`MMMR_SSH_HOST` and `MMMR_SSH_PORT`.

**On Windows**, run it from **Git Bash** (installed with Git for Windows), or
double-click `scripts\export-participant.bat`, which is a thin wrapper around
the same script — there is deliberately only one implementation, so the safety
checks cannot drift between platforms. PowerShell and `cmd` cannot run it
directly.

The rest of this document is what the script does, step by step — useful when
something fails, when you would rather do it by hand, or when you need the
Compass route instead.

---

## Before you start

**Export one participant at a time, filtered by their id.** A plain
`mongodump` of the whole database would put every other participant's health
records on your laptop, which you do not need and should not hold.

What you need:

- SSH access to the VPS. The address, port and username are in `CLAUDE.md`,
  which is gitignored — this repo is public, so they are deliberately not
  written down here. Add them as a `mymissionmyrecord` host alias in
  `~/.ssh/config` and every command below works as written.
- The participant's `_id` — a 24-character hex string, e.g.
  `507f1f77bcf86cd799439011`. Paste the **hex only**, never
  `ObjectId('...')`; the commands wrap it themselves.
- An encrypted drive to put the result on. This is identifiable health data
  under PHIPA.

---

## Where the files actually live

Participants' recordings are written to `/app/uploads/videos/<userId>/<uuid>.webm`
inside the `mmmr-web-backend-1` container. That path is a **Docker named
volume** (`video_uploads` in `docker-compose.yml`), so the files sit outside the
container's lifecycle and survive every rebuild.

On the host they are under `/var/lib/docker/volumes/mmmr-web_video_uploads/_data`,
root-owned — which is why you cannot browse to them over SFTP and why every
command below goes through `docker exec` instead. The container path is also the
stable one: it is `UPLOADS_DIR` in the compose file, whereas the host path is a
Docker implementation detail.

Filenames are UUIDs, so the folder alone tells you nothing about which recording
is which. Titles, dates and transcripts live in `videodatas`, joined on
`filename`. **Keep the Mongo export next to the videos** or the archive is far
less useful later.

---

## Part 1 — Videos

### 1. Set the id and run the preflight

```bash
ID=<24-char hex id>

docker exec mmmr-web-mongodb-1 mongosh mhmr --quiet --eval "
  const o = ObjectId('$ID');
  const u = db.users.findOne({_id:o},{username:1,displayName:1});
  print(u ? 'user:        ' + u.username + '  (' + u.displayName + ')' : 'NO SUCH USER');
  print('videos:      ' + db.videodatas.countDocuments({userId:o}));
  print('transcribed: ' + db.videodatas.countDocuments({userId:o, isTranscribed:true}));
  print('video sets:  ' + db.videosets.countDocuments({userId:o}));
  print('contacts:    ' + db.contacts.countDocuments({userId:o}));
  print('shared:      ' + db.sharedcontents.countDocuments({userId:o}));"

echo -n "files on disk: "
docker exec mmmr-web-backend-1 sh -c "ls -1 /app/uploads/videos/$ID | wc -l"
```

**Two gates before going further:**

- the `user:` line names the participant you expect — ids often differ only in
  the last couple of characters
- `files on disk` equals `videos`. A mismatch means an orphaned file or a record
  whose file is gone. Find out which before archiving, not after.

### 2. Archive with a checksum manifest

```bash
docker exec mmmr-web-backend-1 sh -c "
  cd /app/uploads/videos &&
  sha256sum $ID/* > /tmp/manifest.txt &&
  tar cf /tmp/videos.tar $ID &&
  echo -n 'files in archive: ' && tar tf /tmp/videos.tar | grep -c '\.webm'"
```

No gzip: `.webm` is already compressed, so it costs CPU and saves nothing.

### 3. Stage it outside the home directory

```bash
STAMP=$(date +%F)
DIR=/var/tmp/export-$ID-$STAMP
sudo mkdir -p "$DIR" && sudo chown $USER "$DIR" && cd "$DIR"

docker cp mmmr-web-backend-1:/tmp/videos.tar .
docker cp mmmr-web-backend-1:/tmp/manifest.txt .
sha256sum videos.tar > transfer.sha256
ls -lh; echo; echo "staged at: $DIR"
```

Note the printed path — the next step needs it exactly.

### 4. Pull it to your Mac

In a **new terminal**, not the SSH session. One line, and mind the trailing dot
— it is the destination, and losing it makes `scp` print its usage text:

```bash
ID=<same id>
mkdir -p ~/Desktop/mmmr-export-$ID && cd ~/Desktop/mmmr-export-$ID
scp "mymissionmyrecord:<staged path from step 3>/*" .
```

### 5. Verify and extract

```bash
shasum -a 256 -c transfer.sha256          # must say OK

tar xf videos.tar
shasum -a 256 -c manifest.txt | grep -c OK
find . -name '*.webm' | wc -l
du -sh $ID
```

Run the manifest check **from the export folder, not from inside `$ID`**. The
manifest was generated with `cd /app/uploads/videos && sha256sum $ID/*`, so its
paths are relative to the parent; checking from inside `$ID` looks for
`$ID/$ID/...` and reports every file missing.

Both counts must equal the video count from step 1.

To see only failures:

```bash
shasum -a 256 -c manifest.txt | grep -v ' OK$'
```

Silence means everything matched.

### 6. Clear the staging copy from the VPS

Only once step 5 passes. These are plaintext health records sitting on a
public-facing server.

```bash
rm -rf /var/tmp/export-$ID-$STAMP
docker exec mmmr-web-backend-1 sh -c 'rm -f /tmp/videos.tar /tmp/manifest.txt'
```

---

## Part 2 — Mongo records

Collections holding per-participant data, all keyed on `userId` except `users`:

| Collection | Key |
|---|---|
| `videodatas` | `userId` |
| `videosets` | `userId` |
| `contacts` | `userId` |
| `sharedcontents` | `userId` |
| `users` | `_id` |

### Option A — Compass (readable JSON)

Mongo is bound to `127.0.0.1:27017`, so Compass must tunnel in; it can do this
itself, meaning you never type a command on the server.

1. **New connection → Advanced → Proxy/SSH → SSH with Identity File**
   - hostname, port, username and key as in your `~/.ssh/config`
   - connection string `mongodb://127.0.0.1:27017`
2. Open the `mhmr` database.
3. For `videodatas`, `videosets`, `contacts`, `sharedcontents`, filter with:
   ```js
   { userId: ObjectId('<id>') }
   ```
4. For `users`, filter on `_id` instead:
   ```js
   { _id: ObjectId('<id>') }
   ```
5. **Export Data → Export query results → JSON** for each.

If there is any chance of restoring this later, choose **Canonical Extended
JSON**. Relaxed mode can quietly turn dates into strings.

### Option B — mongodump on the VPS (exact BSON)

Better for an archive you might restore, since BSON round-trips `ObjectId` and
`Date` exactly. Run it from a script file — quoting `$oid` through
`docker exec` is otherwise painful.

```bash
cat > /tmp/export.sh <<'SH'
#!/bin/sh
set -e
ID="$1"
OUT=/tmp/export
rm -rf "$OUT"; mkdir -p "$OUT"
for C in videodatas videosets contacts sharedcontents; do
  mongodump --db mhmr --collection "$C" \
    --query "{\"userId\":{\"\$oid\":\"$ID\"}}" --out "$OUT" --quiet
done
mongodump --db mhmr --collection users \
  --query "{\"_id\":{\"\$oid\":\"$ID\"}}" --out "$OUT" --quiet
echo "--- exported ---"
find "$OUT" -name '*.bson' -exec ls -l {} \;
SH

docker cp /tmp/export.sh mmmr-web-mongodb-1:/tmp/export.sh
docker exec mmmr-web-mongodb-1 sh /tmp/export.sh "$ID"
docker exec mmmr-web-mongodb-1 tar czf /tmp/mongo-export.tgz -C /tmp export
docker cp mmmr-web-mongodb-1:/tmp/mongo-export.tgz "$DIR"
```

Clean up afterwards alongside step 6:

```bash
rm -f /tmp/export.sh
docker exec mmmr-web-mongodb-1 sh -c 'rm -rf /tmp/export /tmp/mongo-export.tgz /tmp/export.sh'
```

---

## FileZilla instead of scp

FileZilla can replace **step 4 only**. It cannot run `docker exec`, and the
Docker volume is root-owned, so it cannot see the videos until step 3 has staged
a copy into `/var/tmp/...`, which your user owns.

It is worth using when a transfer is large enough to drop and need resuming.

- **Protocol** `SFTP`, host/port/user as in `CLAUDE.md`,
  **Logon Type** `Key file`
- Put the staged path in the **Remote site** box, select all three files,
  right-click → Download
- Still run step 5 in a terminal afterwards — FileZilla does not verify
  checksums

Use the key-file option rather than a saved password: FileZilla stores site
passwords in plaintext XML unless a master password is set
(*Settings → Interface → Passwords*).

---

## Known traps

- **`ID`, not `ID1`.** Every command references `$ID`. Setting `ID1` leaves
  `$ID` empty, which makes `ObjectId('')` throw `BSONError: input must be a 24
  character hex string` and turns
  `ls -1 /app/uploads/videos/$ID` into a listing of *every* user folder — a
  plausible-looking number that means nothing.
- **Hex only.** `ObjectId('...')` pasted into the variable breaks every command.
- **The trailing dot on `scp`.** Without it you get the usage text.
- **Manifest paths are relative to the parent.** Verify from the export folder.
- **Midnight rollover.** `$(date +%F)` runs separately on each machine. Always
  copy the path step 3 printed rather than re-deriving the date.
- **Never `docker compose down -v`** on this server. The `-v` removes the
  volumes, which is where every participant's recordings and the database live.

---

## Afterwards

Move the folder to an encrypted drive — FileVault on an external disk, or a
VeraCrypt volume. Do not route it through email or consumer cloud sync.

The `users` document includes `passwordHash`. Harmless, but pointless to
archive; strip it if the drive goes anywhere beyond you.
