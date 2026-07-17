# MyMissionMyRecord — Web App

A MERN-stack web companion to the MyMissionMyRecord (MHMR) Android health journaling app. Users record or upload video health journals, transcribe them, annotate them with emotions, pain scale, keywords, and location, and run AI-powered analysis across video sets — including word clouds, bar graphs, line graphs, and text reports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router v6, Tailwind CSS, Zustand |
| Backend | Node.js + Express + TypeScript (`tsx` runner) |
| Database | MongoDB (local) |
| AI | OpenAI GPT-4 (analysis) + Whisper (transcription) |
| Media | FFmpeg (audio extraction), Multer (file upload) |
| Charts | Recharts, d3-cloud |

---

## Prerequisites

Make sure the following are installed on your machine before getting started:

1. **Node.js** (v18 or later) — https://nodejs.org
2. **MongoDB** (Community Edition, running locally) — https://www.mongodb.com/try/download/community
3. **FFmpeg** — required for audio extraction from video files
   - macOS: `brew install ffmpeg`
   - Windows: https://ffmpeg.org/download.html (add to PATH)
   - Linux: `sudo apt install ffmpeg`
4. **An OpenAI API key** — https://platform.openai.com
5. **concurrently** (global) — for the one-command startup script:
   ```bash
   npm install -g concurrently
   ```

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/IMDC/MMMR-Web.git
cd MMMR-Web
```

### 2. Install dependencies

```bash
cd server && npm install && cd ../client && npm install && cd ..
```

### 3. Configure environment variables

Copy the example env file and fill in your OpenAI API key:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and fill in:
- `API_OPENAI_CHATGPT` and `API_KEY_SPEECH_TO_TEXT` — your API keys
- `SESSION_SECRET` — any long random string (used to sign login session cookies)

### 4. Create the uploads directory

```bash
mkdir -p server/uploads/videos
```

---

## Running the App

From the root directory:

```bash
npm run mmmr
```

This starts the backend and frontend together. Then open **http://localhost:3000** in your browser.

> The backend runs on port **5001** (port 5000 is reserved by macOS AirPlay). The Vite dev server proxies `/api` requests automatically.

---

## User Login & Per-Participant Data Isolation

> **Status: proof of concept.** The app now requires a login. Each participant only sees and can access **their own** videos, video sets, annotations, contacts, and shares. There is no public sign-up — accounts are created manually via a seed script. This models a real study deployment where every participant gets a private account.

### How it works (high level)

- **Auth:** username + password login backed by a server-side **session cookie** (httpOnly, stored in MongoDB via `connect-mongo`). Passwords are hashed with `bcryptjs`. The React app checks the session on load, protects all routes behind a login screen, and shows the current user + a **Log Out** button in the sidebar.
- **Data isolation:** every owned record (`VideoData`, `VideoSet`, `Contact`, `SharedContent`) carries a `userId`, and every API query is scoped to the logged-in user. A participant requesting another user's video, video set, or **stream URL** gets a `404` — the data is invisible, not just hidden in the UI.
- **File storage:** each participant's uploaded videos live in their own folder on disk — `server/uploads/videos/<userId>/…` — so files are physically separated per user, not just in the database.

### Seeding the participant accounts

Accounts are created (or updated) by an editable script. This must be done once before anyone can log in.

1. Open `server/src/scripts/seedUsers.ts` and edit the `USERS` array — set a username, password, and display name for each participant.
2. Run the seed script from the repo root:
   ```bash
   npx tsx server/src/scripts/seedUsers.ts
   ```
   Re-running is safe: existing users (matched by username) are updated in place, so this is also how you change a password.

### Starting fresh (optional)

To wipe **all** participant data (videos, video sets, contacts, shares, and the uploads folder) for a clean test — this does **not** delete user accounts:

```bash
npx tsx server/src/scripts/resetData.ts
```

## Features

- Per-participant login with private, isolated data and per-user file storage (see above)
- Record video via webcam or upload an existing file
- Annotate videos with emotion stickers, pain scale, keywords, location, and text comments
- Transcribe videos using OpenAI Whisper with real-time progress
- Crisis keyword detection with in-app warning
- Organize videos into sets for group analysis
- AI-generated summaries (bullet points or paragraph) using GPT-4
- Word frequency bar graph with hide/show word settings
- Word frequency trends line graph with daily/weekly/date-range views and multi-word comparison
- Interactive word cloud with color palette selection
- Text report with sentiment distribution pie chart and per-video breakdown
- Sharing links and contact management
