# MyMissionMyRecord — Web App

A MERN-stack web companion to the MyMissionMyRecord (MMMR) Android health-journaling app,
built for a veterans' health study. Participants record or upload video health journals,
annotate them with emotions, a pain scale, keywords and location, have them transcribed,
and run AI analysis across sets of videos — word clouds, bar graphs, line graphs and text
reports.

This README covers **running the app locally on macOS or Windows** for development.

---

## Contents

1. [Tech stack](#tech-stack)
2. [How the project is laid out](#how-the-project-is-laid-out)
3. [Prerequisites](#prerequisites)
4. [Setup](#setup)
5. [Running the app](#running-the-app)
6. [Creating a login](#creating-a-login)
7. [MongoDB Compass](#mongodb-compass)
8. [Useful scripts](#useful-scripts)
9. [After pulling updates](#after-pulling-updates)
10. [Troubleshooting](#troubleshooting)
11. [Features](#features)
12. [A note on cost and participant data](#a-note-on-cost-and-participant-data)

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router v6, Tailwind CSS, Zustand |
| Backend | Node.js + Express + TypeScript (run directly with `tsx`) |
| Database | MongoDB (local), Mongoose ODM |
| Sessions | `express-session` + `connect-mongo` (session store lives in MongoDB) |
| AI | OpenAI **GPT-5** (analysis) + **Whisper** (transcription) |
| Media | FFmpeg (audio extraction), Multer (file upload) |
| Charts | Recharts, wordcloud2.js (`wordcloud`) |

---

## How the project is laid out

```
MMMR-Web/
├── package.json          # root: just the `npm run mmmr` dev script
├── client/               # React + Vite frontend  (port 3000)
│   └── src/
│       ├── pages/        # one file per screen
│       ├── components/   # layout/, common/, video/, annotation/
│       ├── store/        # Zustand stores (auth, video, videoSet, analysis, ui)
│       └── api/          # thin axios wrappers per resource
├── server/               # Express + TypeScript backend  (port 5001)
│   ├── .env              # your local secrets — NOT committed
│   └── src/
│       ├── models/       # Mongoose schemas
│       ├── routes/       # URL → controller
│       ├── controllers/  # request handling
│       ├── services/     # transcription, OpenAI, frequency, sentiment, crisis, ffmpeg
│       └── scripts/      # seeding and maintenance (see docs/scripts.md)
└── docs/                 # deeper reference docs
```

Three `package.json` files, three `npm install`s. The root one exists only to start both
servers with a single command.

---

## Prerequisites

### 1. Node.js 20 LTS or newer

Download from <https://nodejs.org> (the LTS build). Check it worked:

```bash
node -v    # should print v20.x or v22.x
npm -v
```

### 2. MongoDB Community Edition 7.x

The app expects a MongoDB server running on your own machine at the default port `27017`.

**macOS** (Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0     # starts now, and on every reboot
```

**Windows:** download the MSI from
<https://www.mongodb.com/try/download/community>. During install, tick
**"Install MongoDB as a Service"** so it starts automatically, and tick
**"Install MongoDB Compass"** while you are there (see
[MongoDB Compass](#mongodb-compass) below).

To confirm it is up, open MongoDB Compass and connect to `mongodb://localhost:27017`
(see [MongoDB Compass](#mongodb-compass)). If you have the `mongosh` shell installed, this
also works:
```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

### 3. FFmpeg

Used to pull the audio track out of a recorded video before transcription.

**macOS:**
```bash
brew install ffmpeg
```

**Windows:** download a build from <https://www.gyan.dev/ffmpeg/builds/>, unzip it,
and add the `bin` folder to your **PATH** environment variable. Then open a *new*
terminal and check:
```bash
ffmpeg -version
```

> The repo also installs `@ffmpeg-installer/ffmpeg`, which ships a prebuilt binary as a
> fallback for local development. Installing FFmpeg yourself is still the reliable path.

### 4. An OpenAI API key

Transcription (Whisper) and analysis (GPT-5) are both OpenAI API calls, so the app needs
a key with billing enabled.

1. Sign in at <https://platform.openai.com>
2. Go to **API keys** → **Create new secret key**
3. Copy it immediately — it is only shown once. It looks like `sk-proj-…`

Without a key the app still runs: you can record, upload and annotate videos, but
transcription and AI analysis will fail.

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/IMDC/MMMR-Web.git
cd MMMR-Web
```

### 2. Install dependencies

All three, from the repo root:

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

> Don't skip the root `npm install` — it provides `concurrently` and `tsx`, which the
> `npm run mmmr` start script needs.

### 3. Create your environment file

```bash
cp server/.env.example server/.env
```

On **Windows** (PowerShell):
```powershell
Copy-Item server\.env.example server\.env
```

Now open `server/.env` and fill in the two values that matter:

```ini
API_OPENAI_CHATGPT=sk-proj-replace-with-your-real-openai-key
SESSION_SECRET=replace-with-a-long-random-string
```

A quick way to generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

#### Every variable, and whether you need to touch it

| Variable | Default if omitted | Do I need to set it? |
|---|---|---|
| `API_OPENAI_CHATGPT` | *(empty)* | **Yes** — your OpenAI key. Transcription and analysis fail without it. |
| `SESSION_SECRET` | an insecure dev fallback | **Yes** — any long random string. Signs the login cookie. |
| `MONGODB_URI` | `mongodb://localhost:27017/mhmr` | No, unless Mongo is on another host or port. |
| `PORT` | `5001` | No. Port 5000 is taken by AirPlay on macOS, hence 5001. |
| `UPLOADS_DIR` | `./uploads/videos` (under `server/`) | No. Created automatically on first upload. |
| `MAX_FILE_SIZE_MB` | `500` | No. |
| `NODE_ENV` | `development` | No. |
| `CORS_ORIGIN` | `http://localhost:3000` | No. |
| `OPENAI_MODEL` | `gpt-5` | No. |
| `OPENAI_REASONING_EFFORT` | `minimal` | No. Keeps GPT-5 fast and cheap. |
| `OPENAI_MAX_COMPLETION_TOKENS` | `1500` | No. |
| `SECURE_COOKIES` | `false` | No — must stay off over plain `http://localhost`. |
| `TRUST_PROXY` | `0` in development | No. |
| `LOGIN_MAX_PER_ACCOUNT` | `5` | No. See [Troubleshooting](#troubleshooting) if you lock yourself out. |
| `LOGIN_MAX_PER_IP` | `100` | No. |
| `LOGIN_WINDOW_MINUTES` | `15` | No. |
| `LOGIN_RATELIMIT_DISABLED` | `false` | Only if repeated login testing keeps locking you out. |
| `API_KEY_SPEECH_TO_TEXT` | *(empty)* | No — **legacy and unused.** Left in place for older configs. |

`server/.env` is gitignored. **Never commit it** — this repository is public.

### 4. Start MongoDB

If you installed it as a service (the default on Windows, and `brew services` on macOS)
it is already running. Otherwise start it manually:

```bash
# macOS
brew services start mongodb-community@7.0
```

The database and its collections are created automatically on first use — there is no
schema to import.

---

## Running the app

From the repo root:

```bash
npm run mmmr
```

That starts the backend and frontend together. Open **<http://localhost:3000>**.

| | URL | Notes |
|---|---|---|
| Frontend | <http://localhost:3000> | Vite dev server, hot-reloads on save |
| Backend | <http://localhost:5001> | Vite proxies `/api` here automatically |
| MongoDB | `mongodb://localhost:27017/mhmr` | |

> **The backend does not hot-reload.** The dev script runs `npx tsx server/src/index.ts`
> with no watch mode, so after editing anything under `server/src/` you must stop
> (`Ctrl+C`) and re-run `npm run mmmr`. Forgetting this means testing stale code, and the
> symptoms are confusing — this has caught people out more than once. Frontend edits under
> `client/src/` *do* reload on their own.

---

## Creating a login

There is no public sign-up. The app requires a login, and every account is created by a
seed script. Each participant sees only their own videos, sets, annotations and contacts.

### Quickest path — one test account

```bash
cd server
npx tsx src/scripts/seedTestUser.ts
```

That creates (or resets) **`testuser`** with password **`Test1234!`**. Re-run it any time
to put the account back to its starting state. It refuses to run against anything other
than a local database.

Custom username and password:

```bash
npx tsx src/scripts/seedTestUser.ts myuser 'MyPassword123!'
```

### A full cohort of accounts

`seedUsers.ts` creates many accounts at once, plus the six default video sets for each
(Work, Holiday, Social, Family & Friends, Entertainment, Errands & Household).

The credentials are **not** in the script — this repo is public, so it reads them from a
gitignored tab-separated file instead:

1. Copy the template:
   ```bash
   cp server/participants.example.tsv server/participants.tsv
   ```
   On Windows (PowerShell): `Copy-Item server\participants.example.tsv server\participants.tsv`
2. Edit `server/participants.tsv` — one `username<TAB>password` per line. `#` starts a
   comment.
3. Run it:
   ```bash
   cd server
   npx tsx src/scripts/seedUsers.ts
   ```

Re-running is safe and is also how you reset a password. Full flag reference —
including the destructive `--prune` and `--fresh` — is in
[`docs/scripts.md`](docs/scripts.md).

### What happens on first login

1. **Forced password change.** Seeded accounts have `mustChangePassword: true`, so the
   first login asks for a new password before a real session is created.
2. **Onboarding.** A short modal collects a display name, a transcription preference and
   AI consent. It appears whenever the account's AI consent has never been answered.

---

## MongoDB Compass

Compass is MongoDB's official desktop GUI. It is the easiest way to see what the app
actually wrote — handy when a video will not transcribe, or you want to confirm an
annotation saved.

### Install

- **Windows:** tick "Install MongoDB Compass" in the MongoDB installer, or download it
  from <https://www.mongodb.com/products/compass>.
- **macOS:** download from <https://www.mongodb.com/products/compass>, or
  `brew install --cask mongodb-compass`.

### Connect

1. Open Compass. It offers a **New Connection** box with a URI field.
2. Paste:
   ```
   mongodb://localhost:27017
   ```
3. Click **Save & Connect**. No username or password — a default local MongoDB has no
   authentication.
4. In the left sidebar, open the **`mhmr`** database.

### What is in there

| Collection | Holds |
|---|---|
| `users` | One document per account: username, bcrypt password hash, display name, `aiConsent`, `autoTranscribe`, `mustChangePassword` |
| `videodatas` | One per recording: title, filename, annotations, `transcript`, sentiment, `frequencyData`, crisis-detection fields |
| `videosets` | Named groups of video IDs, their AI summaries, and saved word settings |
| `contacts` | Sharing contacts |
| `sharedcontents` | Share records |
| `sessions` | Active login sessions, managed by `connect-mongo` |

Collections appear the first time something is written to them, so a fresh install will
be missing some of these.

### Things worth knowing

- **Passwords are bcrypt hashes** and cannot be read or edited back into a usable
  password. To change one, re-run `seedTestUser.ts` or `seedUsers.ts`.
- **`frequencyData` and `bulletSentiments` are JSON stored as strings**, not nested
  objects. Hand-editing them is easy to get wrong — prefer the scripts.
- **Finding one user's videos:** open `users`, copy the `_id` of the account, then in
  `videodatas` use the filter
  ```js
  { userId: ObjectId("paste-the-id-here") }
  ```
- **Only transcribed videos have analysis data.** A quick filter for them:
  ```js
  { isTranscribed: true }
  ```
- Deleting a `videodatas` document does **not** delete the video file from
  `server/uploads/videos/<userId>/`. Use the app's delete button, which removes both.

### Command-line alternative

If you prefer a terminal, `mongosh` is a separate download —
<https://www.mongodb.com/try/download/shell>, or `brew install mongosh` on macOS. The
Windows MongoDB installer offers to include it:

```bash
mongosh mhmr --quiet --eval 'db.users.countDocuments()'
mongosh mhmr --quiet --eval 'db.videodatas.find({}, { title: 1, isTranscribed: 1 }).toArray()'
```

---

## Useful scripts

Run these from the **`server/`** directory. They resolve their own paths, so the same
scripts also work from the repo root if you spell it `server/src/scripts/…`. Full
reference — what each one changes, every flag, and how risky it is — lives in
[`docs/scripts.md`](docs/scripts.md).

| Command | What it does |
|---|---|
| `npx tsx src/scripts/seedTestUser.ts` | Create/reset one test account |
| `npx tsx src/scripts/seedUsers.ts` | Create/reset all accounts from `participants.tsv` |
| `npx tsx src/scripts/seedVideoSets.ts` | Add the six default video sets |
| `npx tsx src/scripts/reprocessFrequency.ts --dry-run` | Recompute word counts from stored transcripts |
| `npx tsx src/scripts/canadianizeTranscripts.ts --dry-run` | Rewrite stored US spellings as Canadian |
| `npx tsx src/scripts/resetData.ts` | **Destructive.** Wipe all videos, sets, contacts and shares (accounts survive) |

Scripts ending in `--dry-run` show what they would change without writing anything. Run
the dry run first.

---

## After pulling updates

```bash
git pull
```

If `package-lock.json` appeared in the changed files, dependencies moved — reinstall:

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

Then restart `npm run mmmr`. If a Mongoose model changed, no migration is needed:
new fields fall back to their schema defaults on existing documents.

---

## Troubleshooting

**`EADDRINUSE: address already in use :::5001`**
A previous backend is still running. Find and stop it:
```bash
# macOS
lsof -ti:5001 | xargs kill
# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 5001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ }
```

**`MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`**
MongoDB is not running. Start the service (see [step 4](#4-start-mongodb)).

**My server change did nothing.**
The backend has no watch mode. Stop `npm run mmmr` and start it again.

**Transcription fails instantly.**
Check, in order: is `API_OPENAI_CHATGPT` set in `server/.env`; did you restart the backend
after setting it; does your OpenAI account have billing enabled; is `ffmpeg -version`
working in the same terminal.

**"Audio file too large for Whisper API".**
Whisper caps uploads at 25 MB of extracted audio. Recordings are capped at 3 minutes,
which stays well under — a much longer uploaded file can exceed it.

**I locked myself out by testing logins.**
Login attempts are rate-limited per account and per IP. Either wait out
`LOGIN_WINDOW_MINUTES` (15 by default) or set `LOGIN_RATELIMIT_DISABLED=true` in
`server/.env` and restart.

**FFmpeg "not recognized" on Windows.**
The `bin` folder is not on your PATH, or the terminal predates the change. Open a new
terminal and re-check `ffmpeg -version`.

**The login page reloads without logging in.**
Make sure `SECURE_COOKIES` is not `true`. Secure cookies are dropped over plain
`http://localhost`.

---

## Features

- Per-participant login, with private data and per-user file storage
- Forced password change on first login, then a short onboarding flow
- Record from a webcam or upload an existing video file
- Device picker for camera, microphone and speaker, with a live mic level meter
- 1-minute recording segments with a 3-minute cap, extendable at 45 seconds
- Annotate with emotion stickers, an NRS 0–10 pain scale, keywords, location and comments
- Transcription via OpenAI Whisper, with live progress streamed to the browser
- Transcripts and AI summaries normalized to Canadian English spelling
- Crisis keyword detection, with an in-app warning listing Ontario and Veterans
  crisis lines
- Group videos into sets for combined analysis
- AI summaries per set, as bullet points or prose, with sentiment
- Sentiment that blends the AI reading with the participant's own reported feeling,
  biased by the reported pain score, and flags disagreements between the two
- Word frequency bar graph, with a frequency filter and per-word hide/show
- Word frequency line graph with daily, weekly and date-range views, and multi-word
  comparison
- Interactive word cloud with selectable colour palettes
- Word settings — hidden words, frequency filter, palette — saved per video set
- Text report with a sentiment pie chart and per-video breakdown
- Sharing links and contact management

---

## A note on cost and participant data

- **OpenAI calls cost real money.** Every transcription and every set analysis bills your
  key. `reprocessFrequency.ts` and `canadianizeTranscripts.ts` are deliberately free —
  they recompute from stored transcripts and make no API calls.
- **Treat local data as real health data.** Videos and transcripts in your local MongoDB
  and `server/uploads/` are participant health records. Do not copy them out of your
  machine, and do not commit them.
- **This repository is public.** `server/.env` and `server/participants.tsv` are
  gitignored for that reason. Before committing anything credential-adjacent, check:
  ```bash
  git check-ignore -v <file>
  ```
