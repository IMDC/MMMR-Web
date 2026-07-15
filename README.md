# MyHealthMyRecord — Web App

A MERN-stack web companion to the MyHealthMyRecord (MHMR) Android health journaling app. Users record or upload video health journals, transcribe them, annotate them with emotions, pain scale, keywords, and location, and run AI-powered analysis across video sets — including word clouds, bar graphs, line graphs, and text reports.

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

Edit `server/.env` — both `API_OPENAI_CHATGPT` and `API_KEY_SPEECH_TO_TEXT`

### 4. Create the uploads directory

```bash
mkdir -p server/uploads/videos
```

---

## Running the App

From the root directory:

```bash
npm run run-mmmr
```

This starts the backend and frontend together. Then open **http://localhost:3000** in your browser.

> The backend runs on port **5001** (port 5000 is reserved by macOS AirPlay). The Vite dev server proxies `/api` requests automatically.

---

## Features

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
