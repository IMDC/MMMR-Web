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

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/IMDC/MMMR-Web.git
cd MMMR-Web
```

### 2. Install server dependencies
```bash
cd server
npm install
```

## 3. Install Express
```bash
cd server
npm i express
```

## 4. Configure environment variables
Create a `.env` file inside the `server/` directory:
API_KEY_SPEECH_TO_TEXT=xxxxxx
API_OPENAI_CHATGPT=xxxxxx

### 4. Install client dependencies

> `--legacy-peer-deps` is required due to a peer dependency conflict with React 18. [this might not be necessary]


```bash
cd ../client
npm install --legacy-peer-deps
```
You may need to allow these legacy dependencies. Some have vulnerabilities. We should try to use supported packages where possible.

---
## 5. Install MongoDB
https://www.mongodb.com/try/download/community
MongoDB is required for the database functionality; instructions for installing are different between operating systems


## Running the App
**Open two terminal windows:

**Terminal 1 — Backend**
```bash
cd server
npx tsx src/index.ts
```

**Terminal 2 — Frontend**
```bash
cd client
npm run dev
```

### Combined run from command line
You can startup both the server and the client with a single command.
For the first time, you will need to install the concurrently function on the first run.
``
npm install concurrently --save-dev
``
For Windows Powershell:
```bash
cd mmmr-web; npm run dev
```
For other terminals:
```bash
cd mmmr-web && npm run dev
```

Then open **http://localhost:3000** in your browser.

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
