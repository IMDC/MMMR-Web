import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';

import videosRouter from './routes/videos';
import videoSetsRouter from './routes/videoSets';
import analysisRouter from './routes/analysis';
import sharingRouter from './routes/sharing';
import contactsRouter from './routes/contacts';

const app = express();

// Security & logging middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/videos', videosRouter);
app.use('/api/videosets', videoSetsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/sharing', sharingRouter);
app.use('/api/contacts', contactsRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

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
