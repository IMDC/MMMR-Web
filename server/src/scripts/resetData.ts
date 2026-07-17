/**
 * Wipe all participant data for a clean POC start.
 * Deletes every VideoData / VideoSet / Contact / SharedContent doc and clears
 * the uploads folder (including per-user subfolders). Users are NOT touched.
 *
 *   npx tsx server/src/scripts/resetData.ts
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { VideoData } from '../models/VideoData';
import { VideoSet } from '../models/VideoSet';
import { Contact } from '../models/Contact';
import { SharedContent } from '../models/SharedContent';

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  const [v, s, c, sh] = await Promise.all([
    VideoData.deleteMany({}),
    VideoSet.deleteMany({}),
    Contact.deleteMany({}),
    SharedContent.deleteMany({}),
  ]);
  console.log(`Deleted: ${v.deletedCount} videos, ${s.deletedCount} sets, ${c.deletedCount} contacts, ${sh.deletedCount} shares`);

  // Clear uploads dir contents (files + per-user subfolders), keep the dir itself.
  if (fs.existsSync(config.uploadsDir)) {
    for (const entry of fs.readdirSync(config.uploadsDir)) {
      fs.rmSync(path.join(config.uploadsDir, entry), { recursive: true, force: true });
    }
    console.log('Cleared uploads dir:', config.uploadsDir);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
