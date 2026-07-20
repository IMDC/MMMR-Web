import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Anchor relative paths to the server/ root (two levels up from src/config)
// so they don't depend on the process working directory (dev server is
// launched from the repo root via `npx tsx server/src/index.ts`).
const SERVER_ROOT = path.resolve(__dirname, '../..');
const uploadsEnv = process.env.UPLOADS_DIR || './uploads/videos';

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mhmr',
  sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-session-secret-change-me',
  openAiKey: process.env.API_OPENAI_CHATGPT || '',
  ibmWatsonKey: process.env.API_KEY_SPEECH_TO_TEXT || '',
  uploadsDir: path.isAbsolute(uploadsEnv)
    ? uploadsEnv
    : path.resolve(SERVER_ROOT, uploadsEnv),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
