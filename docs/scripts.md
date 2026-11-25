# Scripts

Every script in the repo: what it does, how to run it, and what it will change.

Each entry says where to run it **from**, because the paths differ — some are
written relative to the project root, some to `server/`.

Legend:

- 🟢 **safe** — read-only, or idempotent and reversible
- 🟡 **writes** — changes data, but nothing irreplaceable
- 🔴 **destructive** — deletes data; read before running
- 💰 **costs money** — makes paid API calls

---

## Running the app

```bash
npm run mmmr          # from the project root
```

Starts both servers via `concurrently`: frontend on `:3000`, backend on `:5001`
(5000 is taken by macOS AirPlay), Mongo at `mongodb://localhost:27017/mhmr`.

`npx tsx` has **no watch mode** here, so restart the backend after any
server-side edit or you are testing stale code. If `:5001` is already in use,
something older is still running — `lsof -ti:5001 | xargs kill`.

---

## Operations

### `scripts/export-participant.sh` 🟢

Export one participant's videos and Mongo records from the VPS to your machine,
for when they finish the study.

```bash
./scripts/export-participant.sh <24-char-hex-id>          # from the project root
./scripts/export-participant.sh <id> --videos-only        # skip the Mongo half
./scripts/export-participant.sh <id> --out /Volumes/Drive # somewhere else
```

Runs from your laptop and drives the server over SSH. It checks the participant
first, shows you who they are and what will be copied, and **stops** if the
record count does not match the files on disk. After downloading it verifies
every file byte-for-byte, then offers to clear the staging copy off the server.

Read-only on the source: it never modifies or deletes the participant's live
data. If verification fails it keeps the server copy so a bad transfer cannot
lose you the only verified source.

Environment: `MMMR_SSH_HOST`, `MMMR_SSH_PORT` override the defaults.

**Windows:** run from Git Bash, or use `scripts\export-participant.bat`, a thin
wrapper around the same script. PowerShell and `cmd` cannot run it directly.

Full walkthrough and the manual equivalent: [`extraction.md`](extraction.md).

---

## Seeding and participant setup

All paths below are relative to **`server/`** unless stated otherwise.

### `seedUsers.ts` 🔴

Seed every study participant, demo, QA and dev account, plus the 6 default video
sets for each.

```bash
npx tsx src/scripts/seedUsers.ts [--prune|--fresh] [--yes] [--users <path>]
```

Credentials are **not** in the script — the repo is public. It reads a
gitignored TSV (`username <tab> password`), resolved in this order:

1. `--users <path>`
2. `$SEED_USERS_FILE`
3. `<server root>/participants.tsv`

See `participants.example.tsv` for the format.

Every run resets passwords and sets `mustChangePassword: true`, so participants
are forced to choose their own on next login. Existing videos are never touched
by a plain run.

- `--prune` deletes accounts **absent from the file**
- `--fresh` deletes **every** account first

Both also delete those accounts' videos, sets and upload folders. That is the
destructive part — on a live study, think before using either.

### `seedTestUser.ts` 🟡

Seed or reset **one** test account, for exercising the forced-password-change
flow without rewriting every participant's password.

```bash
npx tsx src/scripts/seedTestUser.ts                     # testuser / Test1234!
npx tsx src/scripts/seedTestUser.ts myuser 'MyPass123!'
```

Upserts, so it doubles as the reset half of the loop: password back to the seed
value, `mustChangePassword` back to `true`. It also clears onboarding state
(`aiConsent`, `autoTranscribe`, `summaryFormat`, `recordingInfoDismissed`), so
the account replays first-login as a new user would.

Refuses to run against a non-local database, so a stray invocation cannot reset
an account on the VPS.

### `seedVideoSets.ts` 🟢

Seed the 6 default video sets for all users.

```bash
npx tsx server/src/scripts/seedVideoSets.ts     # from the project root
```

Skips any set whose name already exists for that user. Users can rename sets
afterwards; this only checks the original names, so a renamed set will be
recreated under its default name.

### `cloneVideos.ts` 🟡

Copy one account's videos into every other account — used to give every
participant the same demo recordings. Record them once, then fan them out.

```bash
npx tsx src/scripts/cloneVideos.ts --from anay --limit 2 [--to <user>] [--dry-run]
```

Each target gets its **own** file copy and its own `VideoData` document, because
`filename` is globally unique and `deleteVideo` unlinks the file from the
owner's folder — sharing one file would let one participant's delete break
everyone else's copy.

Transcript, sentiment, analysis output, frequency data and annotations are
copied as-is, so no re-transcription and **no API cost**. Set membership is
mirrored by set name, and a missing set is created.

---

## Maintenance

### `reprocessFrequency.ts` 🟢

Recompute `frequencyData` for every transcribed video from the stored
transcript.

```bash
npx tsx src/scripts/reprocessFrequency.ts --dry-run    # show what would change
npx tsx src/scripts/reprocessFrequency.ts              # write
npx tsx src/scripts/reprocessFrequency.ts --user anay  # one account
```

Counts are written once at transcription time, so a change to the counting rules
does not reach existing videos until this runs. **Run it after any edit to
`frequencyService`**, or the graphs keep showing stale numbers.

Only `frequencyData` is touched — transcripts, sentiment and analysis output are
left alone. Pure recomputation: no Whisper, no OpenAI, no cost, idempotent.

### `canadianizeTranscripts.ts` 🟡

Rewrite stored US spellings as Canadian ones.

```bash
npx tsx src/scripts/canadianizeTranscripts.ts --dry-run    # show what would change
npx tsx src/scripts/canadianizeTranscripts.ts              # write
npx tsx src/scripts/canadianizeTranscripts.ts --user anay  # one account
```

Transcription normalizes spelling as the transcript comes back from Whisper, but
that is forward-only. Anything recorded before that still says "behavior" and
"center", and because word forms are never merged, the word cloud would carry
`behavior` and `behaviour` as two unrelated entries for the rest of the study.
Run this once after deploying the change.

Per video: `transcript`, `tsOutputBullet`, `tsOutputSentence`,
`bulletSentiments`, `videoSummary`, `videoTopics`, plus `frequencyData`
recomputed from the rewritten transcript. Per video set:
`summaryAnalysisBullet`, `summaryAnalysisSentence`, `bulletSentiments`.

No Whisper, no OpenAI, no cost. Idempotent — a second run finds nothing. Crisis
detection is deliberately **not** re-run: no crisis keyword has a US/Canadian
spelling difference, so no match can move, and re-running it would risk
re-flagging videos a participant has already dismissed.

It rewrites stored transcripts in place, so take a backup first if the corpus
matters — the substitutions are listed by `--dry-run` before anything is written.

### `resetData.ts` 🔴

Wipe all participant data for a clean start.

```bash
npx tsx server/src/scripts/resetData.ts        # from the project root
```

Deletes **every** `VideoData`, `VideoSet`, `Contact` and `SharedContent`
document and clears the uploads folder including per-user subfolders. User
accounts are not touched.

There is no undo and no confirmation prompt. Take a backup first — see the
Backups section in `CLAUDE.md`.

---

## Local-only dev helpers

`server/src/scripts/local/` — these exist to check behaviour against the
database rather than the screen while developing. Not for the VPS.

### `local/resetPassword.ts` 🟡

Swap one account's password hash, leaving every other field
(`mustChangePassword`, onboarding state) untouched. Unlike `seedTestUser.ts`,
it does not reset anything else.

```bash
npx tsx src/scripts/local/resetPassword.ts <username> <password>
```

For resetting a **production** participant's password, don't use this — follow
[`passwordReset.md`](passwordReset.md), which goes through the VPS.

### `local/seedConflictFixtures.ts` 🟡

Seed two videos in two dedicated sets, one per code path, for testing the
sentiment-conflict flow end to end.

```bash
npx tsx src/scripts/local/seedConflictFixtures.ts [username]
```

### `local/inspectConflictFixtures.ts` 🟢

Print the fields the conflict work touches, so each test step can be confirmed
against the database rather than the UI.

```bash
npx tsx src/scripts/local/inspectConflictFixtures.ts [username]
```

### `local/checkBiasRecompute.ts` 🟢

Sanity-check the no-GPT bias recompute used by `updateVideo`.

```bash
npx tsx src/scripts/local/checkBiasRecompute.ts
```

### `local/checkCanadianSpelling.ts` 🟢

Check the US → Canadian spelling map. Exits non-zero on a failure, so it can
gate a change to the word list.

```bash
npx tsx src/scripts/local/checkCanadianSpelling.ts
npx tsx src/scripts/local/checkCanadianSpelling.ts "my behavior at the center"
```

With no argument it runs a case table and audits the map for collisions. With
text it rewrites just that text, for spot-checking a phrase before adding it.

The cases that matter most are the ones expected **not** to change: Canadian
English keeps American `-ize`/`-yze` and `anemia`/`pediatric`, Latin-derived
`-or` derivatives stay short (`humorous`, `vigorous`), and whole-word matching
has to leave `Colorado` and `Taylor` alone. **Run it after any edit to
`canadianSpellingService`.**

---

## Before running anything against the VPS

- Scripts that take a username match **lowercase** — the User schema has
  `lowercase: true`.
- Nothing in `server/src/scripts/` is intended to be run on the production
  server casually. `seedTestUser.ts` actively refuses; the others do not.
- Dumps and exports contain participant health data. Do not leave them in the
  VPS home directory, and move them to encrypted storage once local.
