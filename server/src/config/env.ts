import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Anchor relative paths to the server/ root (two levels up from src/config)
// so they don't depend on the process working directory (dev server is
// launched from the repo root via `npx tsx server/src/index.ts`).
const SERVER_ROOT = path.resolve(__dirname, '../..');
const uploadsEnv = process.env.UPLOADS_DIR || './uploads/videos';

// How many reverse proxies sit in front of the app. Express uses this to pick
// the client IP out of X-Forwarded-For. On the VPS the chain is
// host nginx -> frontend container nginx -> backend, so the default is 2.
// Set TRUST_PROXY=0 to disable (direct connections, e.g. local dev).
function parseTrustProxy(): number | boolean {
  const raw = process.env.TRUST_PROXY;
  if (raw === undefined || raw === '') {
    return process.env.NODE_ENV === 'production' ? 2 : 0;
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? false : n;
}

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mhmr',
  sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-session-secret-change-me',
  openAiKey: process.env.API_OPENAI_CHATGPT || '',
  ibmWatsonKey: process.env.API_KEY_SPEECH_TO_TEXT || '',
  // GPT-5 analysis model. Env-overridable so the model can be changed (or
  // rolled back to gpt-4o) on the VPS without a rebuild. Note: gpt-4o needs
  // the legacy `max_tokens`/`temperature` params, so a rollback also means
  // reverting the request body in chatgptService.
  openAiModel: process.env.OPENAI_MODEL || 'gpt-5',
  // 'minimal' keeps GPT-5 closest to gpt-4o: it spends no reasoning tokens,
  // so output length, latency and cost all stay near the old baseline.
  openAiReasoningEffort: process.env.OPENAI_REASONING_EFFORT || 'minimal',
  // Ceiling only — measured visible output is 60-95 tokens, same as gpt-4o
  // under its old 400 limit. Sized well above that because on GPT-5 this
  // budget is shared with reasoning tokens, and exhausting it returns an
  // empty string rather than an error.
  openAiMaxCompletionTokens: parseInt(process.env.OPENAI_MAX_COMPLETION_TOKENS || '1500', 10),
  uploadsDir: path.isAbsolute(uploadsEnv)
    ? uploadsEnv
    : path.resolve(SERVER_ROOT, uploadsEnv),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  secureCookies: process.env.SECURE_COOKIES === 'true',
  trustProxy: parseTrustProxy(),
  // Login brute-force protection. Tunable without a code change so the limits
  // can be adjusted (or switched off) on the VPS via env vars alone.
  loginRateLimit: {
    disabled: process.env.LOGIN_RATELIMIT_DISABLED === 'true',
    maxPerAccount: parseInt(process.env.LOGIN_MAX_PER_ACCOUNT || '5', 10),
    maxPerIp: parseInt(process.env.LOGIN_MAX_PER_IP || '100', 10),
    windowMs: parseInt(process.env.LOGIN_WINDOW_MINUTES || '15', 10) * 60 * 1000,
  },
};
