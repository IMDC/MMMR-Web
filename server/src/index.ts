import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { config } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/requireAuth';

import authRouter from './routes/auth';
import videosRouter from './routes/videos';
import videoSetsRouter from './routes/videoSets';
import analysisRouter from './routes/analysis';
import sharingRouter from './routes/sharing';
import contactsRouter from './routes/contacts';

const app = express();

// Trust the reverse proxy chain (host nginx -> frontend container nginx) so
// req.ip is the real client address from X-Forwarded-For rather than the
// proxy's internal Docker IP. Without this every request looks like it comes
// from one address, which makes per-IP rate limiting apply system-wide.
app.set('trust proxy', config.trustProxy);

// Security & logging middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session (httpOnly cookie, persisted in Mongo so it survives restarts)
app.use(
  session({
    name: 'mhmr.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: config.mongoUri }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.secureCookies,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);

// Health check (public)
// `ip` echoes back the caller's address so the trust-proxy setting can be
// verified from outside: it should differ between two client networks.
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date(), ip: req.ip }),
);

// Auth routes (public)
app.use('/api/auth', authRouter);

// API routes (require a logged-in session)
app.use('/api/videos', requireAuth, videosRouter);
app.use('/api/videosets', requireAuth, videoSetsRouter);
app.use('/api/analysis', requireAuth, analysisRouter);
app.use('/api/sharing', sharingRouter);
app.use('/api/contacts', requireAuth, contactsRouter);

// Global error handler
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`MHMR server running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

start();
